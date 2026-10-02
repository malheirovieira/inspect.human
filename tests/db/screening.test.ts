import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { parseAiConfig } from "@/lib/ai/config";
import { MOCK_RESULT } from "@/lib/ai/providers/mock";
import type { AiProvider, StructuredRequest } from "@/lib/ai/providers";
import { purgeSupersededResumes } from "@/lib/resumes/purge";
import { storeResumeVersionWith } from "@/lib/resumes/versioning";
import { analyzeResume, type AnalyzeDeps } from "@/lib/screening/analyzeResume";
import { RESUME_ANALYZE_TASK, requestResumeAnalysis, resumeAnalyzePayloadSchema } from "@/lib/screening/request";
import { PermanentTaskError, TransientTaskError } from "@/lib/tasks/errors";
import { createTaskRegistry, defineTask, type TaskContext } from "@/lib/tasks/registry";
import { FICTITIOUS_CANDIDATE_NAME, imageOnlyPdf, textResumePdf } from "../fixtures/resumes";
import { createTestClient, skipReason } from "./helpers";

if (skipReason) console.warn(skipReason);

// Triagem com IA de ponta a ponta no Postgres de teste, com provedor
// controlado (nunca chama API real) e Storage em memória. Candidatos e
// currículos FICTÍCIOS.

const registry = createTaskRegistry([
  defineTask({ type: RESUME_ANALYZE_TASK, payloadSchema: resumeAnalyzePayloadSchema, handler: async () => {} }),
]);
const CTX: TaskContext = { taskId: "t", companyId: null, attempt: 1, maxAttempts: 5 };

class ScriptedProvider implements AiProvider {
  readonly name = "mock" as const;
  readonly model = "roteiro";
  readonly isMock = true;
  calls: StructuredRequest[] = [];
  constructor(private script: (call: number) => string | Error) {}
  async generate(req: StructuredRequest) {
    this.calls.push(req);
    const next = this.script(this.calls.length);
    if (next instanceof Error) throw next;
    return next;
  }
}

describe.skipIf(!!skipReason)("triagem com IA (Postgres real)", () => {
  let db: PrismaClient;
  let companyId: string;
  let candidateId: string;
  let applicationId: string;
  const files = new Map<string, Uint8Array>();

  const storage = {
    async uploadIfAbsent(path: string, data: Buffer) {
      files.set(path, new Uint8Array(data));
      return { error: null };
    },
  };

  function deps(provider: AiProvider | null, env: Record<string, string> = {}): AnalyzeDeps {
    return {
      db,
      providerOverride: provider,
      resolveConfig: async () => parseAiConfig(env),
      async downloadResume(path) {
        const f = files.get(path);
        if (!f) throw new Error("arquivo ausente");
        return f;
      },
    };
  }

  async function upload(pdf: Uint8Array, opts: { withApplication?: boolean } = {}) {
    const result = await storeResumeVersionWith(db, storage, {
      companyId,
      candidateId,
      data: Buffer.from(pdf),
      source: "PUBLIC_FORM",
      uploadedById: null,
      applicationId: opts.withApplication === false ? undefined : applicationId,
      onNewVersion: async (tx, { resumeId }) => {
        await requestResumeAnalysis(tx, registry, { companyId, resumeId, allowRealData: false });
      },
    });
    if (!result.ok) throw new Error(result.error);
    return result.resumeId;
  }

  const latestAnalysis = (resumeId: string) =>
    db.resumeAnalysis.findFirst({ where: { resumeId }, orderBy: { generation: "desc" } });

  beforeAll(async () => {
    db = createTestClient();
    companyId = (await db.company.create({ data: { name: "Empresa Fictícia IA", slug: `teste-ia-${Date.now()}` } })).id;
  });

  afterAll(async () => {
    await db.$executeRaw`delete from public.background_tasks where company_id = ${companyId}::uuid`;
    await db.company.delete({ where: { id: companyId } });
    await db.$disconnect();
  });

  beforeEach(async () => {
    files.clear();
    await db.$executeRaw`delete from public.background_tasks where company_id = ${companyId}::uuid`;
    await db.candidate.deleteMany({ where: { companyId } });
    await db.job.deleteMany({ where: { companyId } });
    const job = await db.job.create({ data: { companyId, title: "Vaga fictícia", description: "Teste", workMode: "REMOTO" } });
    const candidate = await db.candidate.create({
      data: { companyId, name: FICTITIOUS_CANDIDATE_NAME, email: "marina@exemplo.test", isTest: true },
    });
    candidateId = candidate.id;
    applicationId = (await db.application.create({ data: { companyId, candidateId, jobId: job.id } })).id;
  });

  it("upload de candidato de teste enfileira a análise na mesma transação", async () => {
    const resumeId = await upload(await textResumePdf());
    const analysis = await latestAnalysis(resumeId);
    expect(analysis).toMatchObject({ status: "PROCESSING", generation: 1 });
    const tasks = await db.backgroundTask.findMany({ where: { companyId, type: RESUME_ANALYZE_TASK } });
    expect(tasks).toHaveLength(1);
    expect(tasks[0].payload).toEqual({ analysisId: analysis!.id });
  });

  it("candidato real com AI_ALLOW_REAL_DATA=false não é enfileirado", async () => {
    await db.candidate.update({ where: { id: candidateId }, data: { isTest: false } });
    const resumeId = await upload(await textResumePdf());
    expect(await latestAnalysis(resumeId)).toBeNull();
    expect(await db.backgroundTask.count({ where: { companyId } })).toBe(0);
  });

  it("mesmo PDF reenviado não gera novo processamento", async () => {
    const pdf = await textResumePdf();
    const first = await upload(pdf);
    const second = await upload(pdf);
    expect(second).toBe(first);
    expect(await db.resumeAnalysis.count({ where: { resumeId: first } })).toBe(1);
  });

  it("processa: extrai, remove dados pessoais, valida e registra na linha do tempo — sem mexer na etapa/tag", async () => {
    await db.application.update({ where: { id: applicationId }, data: { stage: "TRIAGE", qualificationTag: "BLUE" } });
    const resumeId = await upload(await textResumePdf());
    const analysis = (await latestAnalysis(resumeId))!;
    const provider = new ScriptedProvider(() => JSON.stringify(MOCK_RESULT));

    await analyzeResume(deps(provider), analysis.id, CTX);

    const done = await db.resumeAnalysis.findUniqueOrThrow({ where: { id: analysis.id } });
    expect(done).toMatchObject({ status: "DONE", isMock: true, skills: MOCK_RESULT.competencias });

    const sent = provider.calls[0].input;
    for (const leaked of ["Marina", "91234", "123.456.789", "marina.exemplo@", "Flores", "casada", "1991", "github"]) {
      expect(sent).not.toContain(leaked);
    }
    expect(sent).toContain("Analista de Dados Pleno");

    const resume = await db.candidateResume.findUniqueOrThrow({ where: { id: resumeId } });
    expect(resume.textStatus).toBe("OK");
    expect(resume.extractedText).toContain("Marina"); // texto completo fica no banco; só o enviado é minimizado

    const events = await db.applicationEvent.findMany({ where: { applicationId } });
    expect(events.map((e) => e.type)).toEqual(["AI_SUMMARY_GENERATED"]);

    // decisão humana: etapa e tag intactas
    expect(await db.application.findUniqueOrThrow({ where: { id: applicationId } })).toMatchObject({
      stage: "TRIAGE",
      qualificationTag: "BLUE",
    });
  });

  it("PDF sem texto legível: NO_TEXT, sem chamar a IA", async () => {
    const resumeId = await upload(await imageOnlyPdf());
    const analysis = (await latestAnalysis(resumeId))!;
    const provider = new ScriptedProvider(() => JSON.stringify(MOCK_RESULT));

    await analyzeResume(deps(provider), analysis.id, CTX);

    expect(provider.calls).toHaveLength(0);
    expect((await db.resumeAnalysis.findUniqueOrThrow({ where: { id: analysis.id } })).status).toBe("NO_TEXT");
    expect((await db.applicationEvent.findMany({ where: { applicationId } })).map((e) => e.type)).toEqual(["AI_SUMMARY_NO_TEXT"]);
  });

  it("resposta inválida: tenta uma vez de novo, marca falha e a tarefa falha com o motivo técnico", async () => {
    const resumeId = await upload(await textResumePdf());
    const analysis = (await latestAnalysis(resumeId))!;
    const provider = new ScriptedProvider(() => "isto não é json");

    const err = await analyzeResume(deps(provider), analysis.id, CTX).catch((e) => e);
    expect(err).toBeInstanceOf(PermanentTaskError);
    expect(err.message).toContain("1ª: resposta não é JSON válido; 2ª: resposta não é JSON válido");
    expect(err.message).not.toContain("isto não é json"); // nunca a resposta crua

    expect(provider.calls).toHaveLength(2);
    expect(await db.resumeAnalysis.findUniqueOrThrow({ where: { id: analysis.id } })).toMatchObject({
      status: "FAILED",
      errorCode: "INVALID_OUTPUT",
    });
  });

  it("resposta inválida na 1ª e válida na 2ª: conclui", async () => {
    const resumeId = await upload(await textResumePdf());
    const analysis = (await latestAnalysis(resumeId))!;
    const provider = new ScriptedProvider((n) => (n === 1 ? "{}" : JSON.stringify(MOCK_RESULT)));
    await analyzeResume(deps(provider), analysis.id, CTX);
    expect((await db.resumeAnalysis.findUniqueOrThrow({ where: { id: analysis.id } })).status).toBe("DONE");
  });

  it("429 do provedor: relança como temporário e a análise continua Processando", async () => {
    const resumeId = await upload(await textResumePdf());
    const analysis = (await latestAnalysis(resumeId))!;
    const provider = new ScriptedProvider(() => new TransientTaskError("HTTP 429"));

    await expect(analyzeResume(deps(provider), analysis.id, CTX)).rejects.toBeInstanceOf(TransientTaskError);
    expect((await db.resumeAnalysis.findUniqueOrThrow({ where: { id: analysis.id } })).status).toBe("PROCESSING");
  });

  it("erro comum só marca falha na última tentativa", async () => {
    const resumeId = await upload(await textResumePdf());
    const analysis = (await latestAnalysis(resumeId))!;
    const provider = new ScriptedProvider(() => new Error("HTTP 500"));

    await expect(analyzeResume(deps(provider), analysis.id, CTX)).rejects.toThrow();
    expect((await db.resumeAnalysis.findUniqueOrThrow({ where: { id: analysis.id } })).status).toBe("PROCESSING");

    await expect(analyzeResume(deps(provider), analysis.id, { ...CTX, attempt: 5 })).rejects.toThrow();
    expect(await db.resumeAnalysis.findUniqueOrThrow({ where: { id: analysis.id } })).toMatchObject({
      status: "FAILED",
      errorCode: "PROVIDER",
    });
  });

  it("regra conferida de novo no processamento: desmarcar teste → SKIPPED, sem chamar a IA", async () => {
    const resumeId = await upload(await textResumePdf());
    const analysis = (await latestAnalysis(resumeId))!;
    await db.candidate.update({ where: { id: candidateId }, data: { isTest: false } });
    const provider = new ScriptedProvider(() => JSON.stringify(MOCK_RESULT));

    await analyzeResume(deps(provider), analysis.id, CTX);

    expect(provider.calls).toHaveLength(0);
    expect(await db.resumeAnalysis.findUniqueOrThrow({ where: { id: analysis.id } })).toMatchObject({
      status: "SKIPPED",
      skipReason: "REAL_DATA_BLOCKED",
    });
  });

  it("nova geração mantém tags editadas pelo recrutador", async () => {
    const resumeId = await upload(await textResumePdf());
    const first = (await latestAnalysis(resumeId))!;
    await analyzeResume(deps(new ScriptedProvider(() => JSON.stringify(MOCK_RESULT))), first.id, CTX);
    await db.resumeAnalysis.update({ where: { id: first.id }, data: { skills: ["Editada"], skillsEditedAt: new Date() } });

    const again = await requestResumeAnalysis(db, registry, {
      companyId,
      resumeId,
      allowRealData: false,
      force: true,
      keepSkillsFrom: first.id,
    });
    expect(again.status).toBe("queued");
    if (again.status !== "queued") return;
    await analyzeResume(deps(new ScriptedProvider(() => JSON.stringify(MOCK_RESULT))), again.analysisId, CTX);

    const second = await db.resumeAnalysis.findUniqueOrThrow({ where: { id: again.analysisId } });
    expect(second).toMatchObject({ generation: 2, status: "DONE", skills: ["Editada"] });
  });

  it("tarefa repetida numa análise já concluída não faz nada", async () => {
    const resumeId = await upload(await textResumePdf());
    const analysis = (await latestAnalysis(resumeId))!;
    const provider = new ScriptedProvider(() => JSON.stringify(MOCK_RESULT));
    await analyzeResume(deps(provider), analysis.id, CTX);
    await analyzeResume(deps(provider), analysis.id, CTX);
    expect(provider.calls).toHaveLength(1);
    expect(await db.applicationEvent.count({ where: { applicationId } })).toBe(1);
  });

  it("retenção: apaga versão substituída antiga e mantém a atual e as de candidatura em andamento", async () => {
    const oldFree = await upload(await textResumePdf(["Versão antiga livre", "x".repeat(300)]), { withApplication: false });
    const oldInProcess = await upload(await textResumePdf(["Versão antiga em processo", "y".repeat(300)]));
    const current = await upload(await textResumePdf(["Versão atual", "z".repeat(300)]), { withApplication: false });

    const longAgo = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000);
    await db.candidateResume.updateMany({ where: { id: { in: [oldFree, oldInProcess] } }, data: { supersededAt: longAgo } });

    const removed: string[] = [];
    const count = await purgeSupersededResumes({ db, removeFiles: async (paths) => void removed.push(...paths) });

    expect(count).toBe(1);
    expect(removed).toHaveLength(1);
    const remaining = (await db.candidateResume.findMany({ where: { candidateId } })).map((r) => r.id).sort();
    expect(remaining).toEqual([oldInProcess, current].sort());
  });
});

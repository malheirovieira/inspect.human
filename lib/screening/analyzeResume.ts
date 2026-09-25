import type { Prisma, PrismaClient } from "@prisma/client";
import type { AiConfig } from "@/lib/ai/config";
import { getAiBlockReason } from "@/lib/ai/availability";
import { extractResumeText } from "@/lib/ai/extract";
import type { AiProvider } from "@/lib/ai/providers";
import { redactResumeText, truncateForAi } from "@/lib/ai/redact";
import {
  PROMPT_VERSION,
  SCREENING_JSON_SCHEMA,
  SCREENING_SYSTEM_PROMPT,
  buildScreeningInput,
  parseScreeningOutput,
  type ParseOutcome,
} from "@/lib/ai/screening";
import { PermanentTaskError, TransientTaskError } from "@/lib/tasks/errors";
import { isLastAttempt, type TaskContext } from "@/lib/tasks/registry";
import { hasActiveAiConsent } from "./request";

// Processamento de UMA análise (tarefa resume.analyze). Dependências por
// parâmetro (banco, Storage, provedor, config) pra ser testado no projeto de
// teste com mock. O app liga isso em lib/tasks/handlers/resumeAnalyze.ts.
//
// Garantia de produto: NADA aqui altera etapa (stage) nem tag de triagem
// (qualificationTag) da candidatura — a decisão sobre o candidato é sempre
// humana. Só grava em resume_analyses, candidate_resumes (texto extraído) e
// application_events (linha do tempo).

export type AnalyzeDeps = {
  db: PrismaClient;
  downloadResume(storagePath: string): Promise<Uint8Array>;
  config: AiConfig;
  provider: AiProvider | null;
};

// Códigos curtos gravados em resume_analyses.error_code (sem dado pessoal).
export type AnalysisErrorCode = "CONFIG" | "INVALID_PDF" | "DOWNLOAD" | "PROVIDER" | "INVALID_OUTPUT";

export const AI_EVENT_TYPES = {
  GENERATED: "AI_SUMMARY_GENERATED",
  NO_TEXT: "AI_SUMMARY_NO_TEXT",
  FAILED: "AI_SUMMARY_FAILED",
} as const;

export async function analyzeResume(deps: AnalyzeDeps, analysisId: string, ctx: TaskContext): Promise<void> {
  const { db } = deps;

  const analysis = await db.resumeAnalysis.findUnique({
    where: { id: analysisId },
    include: {
      company: { select: { aiScreeningEnabled: true } },
      resume: { include: { candidate: { select: { id: true, name: true, isTest: true } } } },
    },
  });
  // Apagada (retenção) ou já finalizada numa execução anterior: nada a fazer
  // (tarefa pode rodar mais de uma vez).
  if (!analysis || analysis.status !== "PROCESSING") return;

  const { resume, companyId } = analysis;
  const candidate = resume.candidate;

  // Regra conferida DE NOVO aqui — a configuração pode ter mudado enquanto
  // a tarefa esperava na fila.
  const blockReason = getAiBlockReason({
    isTest: candidate.isTest,
    allowRealData: deps.config.allowRealData,
    companyEnabled: analysis.company.aiScreeningEnabled,
    hasAiConsent: await hasActiveAiConsent(db, companyId, candidate.id),
  });
  if (blockReason) {
    await db.resumeAnalysis.updateMany({
      where: { id: analysisId, status: "PROCESSING" },
      data: { status: "SKIPPED", skipReason: blockReason, completedAt: new Date() },
    });
    return;
  }

  const finishFailed = (errorCode: AnalysisErrorCode) =>
    finish(
      db,
      analysis,
      { status: "FAILED", errorCode, provider: deps.provider?.name ?? null, model: deps.provider?.model ?? null },
      AI_EVENT_TYPES.FAILED,
      { errorCode }
    );

  if (deps.config.error || !deps.provider) {
    await finishFailed("CONFIG");
    throw new PermanentTaskError(`Configuração de IA inválida: ${deps.config.error ?? "sem provedor"}`);
  }
  const provider = deps.provider;

  // ---- texto (extraído uma vez por versão; reaproveitado em nova geração)
  let textStatus = resume.textStatus;
  let text = resume.extractedText ?? "";
  if (textStatus === "PENDING") {
    let data: Uint8Array;
    try {
      data = await deps.downloadResume(resume.storagePath);
    } catch (err) {
      if (isLastAttempt(ctx)) await finishFailed("DOWNLOAD");
      throw err;
    }
    const extracted = await extractResumeText(data);
    textStatus = extracted.status;
    text = extracted.status === "INVALID_PDF" ? "" : extracted.text;
    await db.candidateResume.update({
      where: { id: resume.id },
      data: {
        textStatus,
        extractedText: extracted.status === "INVALID_PDF" ? null : extracted.text,
        pageCount: extracted.status === "INVALID_PDF" ? null : extracted.pageCount,
        extractedAt: new Date(),
      },
    });
  }

  if (textStatus === "INVALID_PDF") {
    await finishFailed("INVALID_PDF");
    // Falha da TAREFA também (permanente), pra aparecer em Configurações →
    // Tarefas com o motivo técnico.
    throw new PermanentTaskError("PDF inválido: corrompido, protegido por senha ou não é PDF");
  }
  if (textStatus === "NO_TEXT") {
    // Sem texto legível (ex.: digitalizado): a IA NÃO é chamada.
    await finish(db, analysis, { status: "NO_TEXT" }, AI_EVENT_TYPES.NO_TEXT, {});
    return;
  }

  // ---- minimização + chamada (só texto, nunca o PDF)
  const input = buildScreeningInput(truncateForAi(redactResumeText(text, { candidateName: candidate.name })));
  const request = {
    system: SCREENING_SYSTEM_PROMPT,
    input,
    schemaName: "triagem_curriculo",
    jsonSchema: SCREENING_JSON_SCHEMA,
  };

  // Resposta rejeitada (não é JSON, sem resumo, termo proibido): tenta mais
  // UMA vez; depois, falha. Os motivos são técnicos e sem conteúdo do
  // currículo — a resposta crua NUNCA é gravada nem logada.
  let outcome: ParseOutcome = { ok: false, reason: "sem resposta" };
  const reasons: string[] = [];
  for (let call = 1; call <= 2 && !outcome.ok; call++) {
    let raw: string;
    try {
      raw = await provider.generate(request);
    } catch (err) {
      // 429/503: volta pra fila sem consumir tentativa; análise continua
      // PROCESSING (não é falha do currículo).
      if (err instanceof TransientTaskError) throw err;
      if (err instanceof PermanentTaskError || isLastAttempt(ctx)) await finishFailed("PROVIDER");
      throw err;
    }
    outcome = parseScreeningOutput(raw);
    if (!outcome.ok) reasons.push(`${call}ª: ${outcome.reason}`);
  }

  if (!outcome.ok) {
    await finishFailed("INVALID_OUTPUT");
    throw new PermanentTaskError(`Resposta da IA rejeitada nas 2 tentativas (${reasons.join("; ")})`);
  }

  const result = { ...outcome.data, promptVersion: PROMPT_VERSION };
  await finish(
    db,
    analysis,
    {
      status: "DONE",
      result,
      // Tags editadas pelo recrutador e mantidas na regeneração não são sobrescritas.
      ...(analysis.skillsEditedAt ? {} : { skills: outcome.data.competencias }),
      provider: provider.name,
      model: provider.model,
      isMock: provider.isMock,
    },
    AI_EVENT_TYPES.GENERATED,
    { isMock: provider.isMock }
  );
}

type AnalysisRow = { id: string; companyId: string; resumeId: string; generation: number; resume: { candidateId: string } };

// Fecha a análise (só se ainda PROCESSING — idempotente) e registra o evento
// na linha do tempo, numa transação.
async function finish(
  db: PrismaClient,
  analysis: AnalysisRow,
  data: Prisma.ResumeAnalysisUpdateManyMutationInput,
  eventType: string,
  eventPayload: Record<string, unknown>
): Promise<void> {
  await db.$transaction(async (tx) => {
    const { count } = await tx.resumeAnalysis.updateMany({
      where: { id: analysis.id, status: "PROCESSING" },
      data: { ...data, completedAt: new Date() },
    });
    if (count === 0) return;

    const applicationIds = await timelineTargets(tx, analysis);
    if (applicationIds.length === 0) return;
    await tx.applicationEvent.createMany({
      data: applicationIds.map((applicationId) => ({
        companyId: analysis.companyId,
        applicationId,
        type: eventType,
        payload: { analysisId: analysis.id, generation: analysis.generation, ...eventPayload } as Prisma.InputJsonValue,
        actorId: null,
      })),
    });
  });
}

// Candidaturas que recebem o evento: as que foram enviadas com ESTA versão;
// se nenhuma (ex.: currículo novo subido no perfil), a candidatura mais
// recente da pessoa.
async function timelineTargets(tx: Prisma.TransactionClient, analysis: AnalysisRow): Promise<string[]> {
  const withVersion = await tx.application.findMany({
    where: { companyId: analysis.companyId, resumeId: analysis.resumeId },
    select: { id: true },
  });
  if (withVersion.length > 0) return withVersion.map((a) => a.id);
  const latest = await tx.application.findFirst({
    where: { companyId: analysis.companyId, candidateId: analysis.resume.candidateId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  return latest ? [latest.id] : [];
}

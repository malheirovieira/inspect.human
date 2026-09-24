import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sha256Hex } from "@/lib/resumes/files";
import { storeResumeVersionWith, type ResumeStorage } from "@/lib/resumes/versioning";
import { createTestClient, skipReason } from "./helpers";

if (skipReason) console.warn(skipReason);

// PDFs fictícios — só a assinatura importa pro versionamento.
const PDF_A = Buffer.from("%PDF-1.4\nCurrículo fictício A — Maria Exemplo");
const PDF_B = Buffer.from("%PDF-1.4\nCurrículo fictício B — Maria Exemplo (atualizado)");

class FakeStorage implements ResumeStorage {
  uploads: string[] = [];
  failNext = false;
  async uploadIfAbsent(path: string) {
    if (this.failNext) {
      this.failNext = false;
      return { error: "falha simulada" };
    }
    this.uploads.push(path);
    return { error: null };
  }
}

describe.skipIf(!!skipReason)("versionamento de currículo (Postgres real)", () => {
  let db: PrismaClient;
  let storage: FakeStorage;
  let companyId: string;
  let candidateId: string;
  let applicationId: string;
  let otherCandidateId: string;

  beforeAll(async () => {
    db = createTestClient();
    const company = await db.company.create({
      data: { name: "Empresa Fictícia de Teste", slug: `teste-versoes-${Date.now()}` },
    });
    companyId = company.id;
  });

  afterAll(async () => {
    // cascade apaga vaga, candidatos, candidaturas e versões
    await db.company.delete({ where: { id: companyId } });
    await db.$disconnect();
  });

  beforeEach(async () => {
    storage = new FakeStorage();
    await db.candidate.deleteMany({ where: { companyId } });
    await db.job.deleteMany({ where: { companyId } });

    const job = await db.job.create({
      data: { companyId, title: "Vaga fictícia", description: "Teste", workMode: "REMOTO" },
    });
    const candidate = await db.candidate.create({
      data: { companyId, name: "Maria Exemplo", email: "maria@exemplo.test" },
    });
    const other = await db.candidate.create({
      data: { companyId, name: "João Exemplo", email: "joao@exemplo.test" },
    });
    const application = await db.application.create({
      data: { companyId, candidateId: candidate.id, jobId: job.id },
    });
    candidateId = candidate.id;
    otherCandidateId = other.id;
    applicationId = application.id;
  });

  const store = (data: Buffer, extra: { applicationId?: string; candidateId?: string } = {}) =>
    storeResumeVersionWith(db, storage, {
      companyId,
      candidateId: extra.candidateId ?? candidateId,
      data,
      source: "PUBLIC_FORM",
      uploadedById: null,
      applicationId: extra.applicationId,
    });

  const versions = () => db.candidateResume.findMany({ where: { candidateId }, orderBy: { createdAt: "asc" } });

  it("primeiro envio cria a versão, vira a atual e fica registrado na candidatura", async () => {
    const result = await store(PDF_A, { applicationId });
    expect(result).toMatchObject({ ok: true, reused: false });

    const [v] = await versions();
    expect(v.sha256).toBe(sha256Hex(PDF_A));
    expect(v.storagePath).toBe(`${companyId}/${candidateId}/${sha256Hex(PDF_A)}.pdf`);
    expect(v.supersededAt).toBeNull();
    expect(storage.uploads).toEqual([v.storagePath]);

    expect((await db.candidate.findUniqueOrThrow({ where: { id: candidateId } })).currentResumeId).toBe(v.id);
    expect((await db.application.findUniqueOrThrow({ where: { id: applicationId } })).resumeId).toBe(v.id);
  });

  it("mesmo arquivo de novo reaproveita a versão, sem novo upload", async () => {
    const first = await store(PDF_A);
    storage.uploads = [];
    const second = await store(PDF_A);

    expect(second).toMatchObject({ ok: true, reused: true });
    if (first.ok && second.ok) expect(second.resumeId).toBe(first.resumeId);
    expect(storage.uploads).toEqual([]);
    expect(await versions()).toHaveLength(1);
  });

  it("arquivo diferente vira versão nova; a anterior é marcada substituída e a candidatura não muda", async () => {
    const a = await store(PDF_A, { applicationId });
    const b = await store(PDF_B, { applicationId });
    if (!a.ok || !b.ok) throw new Error("upload falhou");

    const [va, vb] = await versions();
    expect(va.id).toBe(a.resumeId);
    expect(va.supersededAt).not.toBeNull();
    expect(vb.id).toBe(b.resumeId);
    expect(vb.supersededAt).toBeNull();
    expect(va.storagePath).not.toBe(vb.storagePath);

    expect((await db.candidate.findUniqueOrThrow({ where: { id: candidateId } })).currentResumeId).toBe(vb.id);
    // registro histórico: continua apontando pra versão enviada com a candidatura
    expect((await db.application.findUniqueOrThrow({ where: { id: applicationId } })).resumeId).toBe(va.id);
  });

  it("reenviar um arquivo antigo o torna atual de novo e tira da contagem de retenção", async () => {
    await store(PDF_A);
    await store(PDF_B);
    const again = await store(PDF_A);
    expect(again).toMatchObject({ ok: true, reused: true });

    const [va, vb] = await versions();
    expect(va.supersededAt).toBeNull();
    expect(vb.supersededAt).not.toBeNull();
    expect((await db.candidate.findUniqueOrThrow({ where: { id: candidateId } })).currentResumeId).toBe(va.id);
  });

  it("dois envios simultâneos do mesmo arquivo geram uma versão só", async () => {
    const results = await Promise.all([store(PDF_A), store(PDF_A)]);
    expect(results.every((r) => r.ok)).toBe(true);
    expect(await versions()).toHaveLength(1);
  });

  it("recusa arquivo que não é PDF sem gravar nada", async () => {
    const result = await store(Buffer.from("PK\u0003\u0004 não é pdf"));
    expect(result).toMatchObject({ ok: false });
    expect(storage.uploads).toEqual([]);
    expect(await versions()).toHaveLength(0);
  });

  it("falha no Storage não cria versão", async () => {
    storage.failNext = true;
    const result = await store(PDF_A);
    expect(result).toMatchObject({ ok: false });
    expect(await versions()).toHaveLength(0);
  });

  it("não grava a versão na candidatura de outra pessoa", async () => {
    await store(PDF_A, { candidateId: otherCandidateId, applicationId });
    expect((await db.application.findUniqueOrThrow({ where: { id: applicationId } })).resumeId).toBeNull();
  });
});

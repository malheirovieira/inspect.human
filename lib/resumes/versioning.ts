import type { Prisma, PrismaClient } from "@prisma/client";
import { isPdfBuffer, resumeStoragePath, sha256Hex } from "./files";

// Núcleo do versionamento de currículo. Sem server-only / lib/prisma /
// Supabase: banco e Storage chegam por parâmetro, pra ser testado no projeto
// Supabase de teste com um Storage falso. O app usa storeResumeVersion.ts.

export type ResumeSource = "PUBLIC_FORM" | "RECRUITER";

export type ResumeStorage = {
  // Sobe o arquivo SEM sobrescrever. "Já existe" não é erro (o caminho é o
  // hash, então é o mesmo conteúdo).
  uploadIfAbsent(path: string, data: Buffer): Promise<{ error: string | null }>;
};

export type StoreResumeInput = {
  companyId: string;
  candidateId: string;
  data: Buffer;
  source: ResumeSource;
  uploadedById: string | null;
  applicationId?: string;
  // Chamado DENTRO da transação só quando a versão é nova (arquivo nunca
  // visto pra essa pessoa) — é onde o app enfileira a triagem com IA, junto
  // com a gravação da versão.
  onNewVersion?: (tx: Prisma.TransactionClient, info: { resumeId: string }) => Promise<void>;
};

export type StoreResumeResult =
  | { ok: true; resumeId: string; reused: boolean }
  | { ok: false; error: string };

// Cada arquivo diferente vira uma VERSÃO nova com caminho próprio
// (empresa/pessoa/<sha256>.pdf) — nunca upsert por cima de outro arquivo. O
// mesmo arquivo enviado de novo reaproveita a versão existente (sem
// processar de novo na Fase 3).
//
// Efeitos, numa transação:
// - a versão vira a ATUAL da pessoa (Candidate.currentResumeId); a anterior
//   ganha supersededAt (base da retenção);
// - com applicationId: grava Application.resumeId só se ainda estiver vazio —
//   é o registro de qual versão foi enviada com a candidatura, nunca muda.
//
// O arquivo sobe pro Storage ANTES da transação (Storage não é
// transacional). Se a transação falhar, sobra um arquivo sem linha no banco
// — aceitável (é do mesmo candidato, e o próximo upload do mesmo arquivo
// reaproveita o caminho).
export async function storeResumeVersionWith(
  db: PrismaClient,
  storage: ResumeStorage,
  input: StoreResumeInput
): Promise<StoreResumeResult> {
  const { companyId, candidateId, data, source, uploadedById, applicationId, onNewVersion } = input;

  // O Content-Type vem do navegador; a assinatura do arquivo não mente.
  if (!isPdfBuffer(data)) return { ok: false, error: "O arquivo não parece ser um PDF válido." };

  const sha256 = sha256Hex(data);
  const storagePath = resumeStoragePath(companyId, candidateId, sha256);

  const existing = await db.candidateResume.findUnique({
    where: { candidateId_sha256: { candidateId, sha256 } },
    select: { id: true },
  });

  if (!existing) {
    const { error } = await storage.uploadIfAbsent(storagePath, data);
    if (error) {
      console.error("Falha ao subir currículo pro Storage:", error);
      return { ok: false, error: "Falha ao enviar o arquivo. Tente novamente." };
    }
  }

  const resumeId = await db.$transaction(async (tx) => {
    if (!existing) {
      // skipDuplicates (ON CONFLICT DO NOTHING) em vez de create: um envio
      // simultâneo do mesmo arquivo não aborta a transação.
      await tx.candidateResume.createMany({
        data: [{ companyId, candidateId, storagePath, sha256, sizeBytes: data.length, source, uploadedById }],
        skipDuplicates: true,
      });
    }
    const resume = await tx.candidateResume.findUniqueOrThrow({
      where: { candidateId_sha256: { candidateId, sha256 } },
      select: { id: true },
    });

    const candidate = await tx.candidate.findFirstOrThrow({
      where: { id: candidateId, companyId },
      select: { currentResumeId: true },
    });
    if (candidate.currentResumeId !== resume.id) {
      if (candidate.currentResumeId) {
        await tx.candidateResume.update({
          where: { id: candidate.currentResumeId },
          data: { supersededAt: new Date() },
        });
      }
      await tx.candidate.update({ where: { id: candidateId }, data: { currentResumeId: resume.id } });
    }
    // Voltou a ser a atual (ex.: reenviou um arquivo antigo) — sai da contagem de retenção.
    await tx.candidateResume.update({ where: { id: resume.id }, data: { supersededAt: null } });

    if (applicationId) {
      await tx.application.updateMany({
        where: { id: applicationId, companyId, candidateId, resumeId: null },
        data: { resumeId: resume.id },
      });
    }

    if (!existing && onNewVersion) await onNewVersion(tx, { resumeId: resume.id });

    return resume.id;
  });

  return { ok: true, resumeId, reused: Boolean(existing) };
}

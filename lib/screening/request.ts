import type { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";
import { AI_SCREENING_CONSENT_PURPOSE, getAiBlockReason, type AiBlockReason } from "@/lib/ai/availability";
import { enqueueTask } from "@/lib/tasks/queue";
import type { TaskRegistry } from "@/lib/tasks/registry";

export const RESUME_ANALYZE_TASK = "resume.analyze";
export const resumeAnalyzePayloadSchema = z.object({ analysisId: z.string().uuid() });

type Db = PrismaClient | Prisma.TransactionClient;

export async function hasActiveAiConsent(db: Db, companyId: string, candidateId: string): Promise<boolean> {
  const consent = await db.consent.findFirst({
    where: { companyId, candidateId, purpose: AI_SCREENING_CONSENT_PURPOSE, revokedAt: null },
    select: { id: true },
  });
  return consent !== null;
}

export type RequestAnalysisResult =
  | { status: "queued"; analysisId: string }
  | { status: "blocked"; reason: AiBlockReason }
  | { status: "exists" };

// Pede uma análise por IA de uma VERSÃO de currículo: cria a linha em
// resume_analyses (PROCESSING) e enfileira resume.analyze — nunca processa
// dentro do request. Passe o `tx` pra enfileirar junto com o upload.
//
// - automático (upload): force=false → se a versão já tem qualquer análise,
//   não faz nada (um processamento por versão — o mesmo PDF reenviado cai
//   na mesma versão pelo hash).
// - "Gerar novamente"/"Tentar novamente": force=true → nova geração.
//   keepSkillsFrom: id da análise anterior cujas tags EDITADAS devem ser
//   mantidas (a interface pede confirmação antes de sobrescrever edição).
// - Bloqueado pela regra de disponibilidade: nada é criado; a interface
//   mostra o motivo calculado na hora.
export async function requestResumeAnalysis(
  db: Db,
  registry: TaskRegistry,
  input: {
    companyId: string;
    resumeId: string;
    allowRealData: boolean;
    force?: boolean;
    keepSkillsFrom?: string;
  }
): Promise<RequestAnalysisResult> {
  const { companyId, resumeId, allowRealData, force = false, keepSkillsFrom } = input;

  const resume = await db.candidateResume.findFirst({
    where: { id: resumeId, companyId },
    select: {
      candidate: { select: { id: true, isTest: true } },
      company: { select: { aiScreeningEnabled: true } },
      analyses: { orderBy: { generation: "desc" }, take: 1, select: { generation: true } },
    },
  });
  if (!resume) throw new Error("Versão de currículo não encontrada");

  const reason = getAiBlockReason({
    isTest: resume.candidate.isTest,
    allowRealData,
    companyEnabled: resume.company.aiScreeningEnabled,
    hasAiConsent: await hasActiveAiConsent(db, companyId, resume.candidate.id),
  });
  if (reason) return { status: "blocked", reason };

  const last = resume.analyses[0];
  if (last && !force) return { status: "exists" };
  const generation = (last?.generation ?? 0) + 1;

  let preset: { skills: string[]; skillsEditedAt: Date | null; skillsEditedById: string | null } | undefined;
  if (keepSkillsFrom) {
    const previous = await db.resumeAnalysis.findFirst({
      where: { id: keepSkillsFrom, resumeId, companyId },
      select: { skills: true, skillsEditedAt: true, skillsEditedById: true },
    });
    if (previous?.skillsEditedAt) preset = previous;
  }

  // createMany + skipDuplicates (ON CONFLICT DO NOTHING): dois pedidos
  // simultâneos da mesma geração não abortam a transação do upload.
  const { count } = await db.resumeAnalysis.createMany({
    data: [{ companyId, resumeId, generation, status: "PROCESSING", ...preset }],
    skipDuplicates: true,
  });
  if (count === 0) return { status: "exists" };

  const analysis = await db.resumeAnalysis.findUniqueOrThrow({
    where: { resumeId_generation: { resumeId, generation } },
    select: { id: true },
  });
  await enqueueTask(db, registry, RESUME_ANALYZE_TASK, { analysisId: analysis.id }, {
    companyId,
    idempotencyKey: `${RESUME_ANALYZE_TASK}:${analysis.id}`,
  });
  return { status: "queued", analysisId: analysis.id };
}

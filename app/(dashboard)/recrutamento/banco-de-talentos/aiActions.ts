"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { getAiConfig } from "@/lib/ai";
import { AI_BLOCK_REASON_LABELS } from "@/lib/ai/availability";
import { dedupeTags } from "@/lib/ai/screening";
import { requestResumeAnalysis } from "@/lib/screening/request";
import { taskRegistry } from "@/lib/tasks";

export type AiActionResult = { error: string } | { success: true };

// "Gerar resumo" / "Gerar novamente" / "Tentar novamente" no perfil — nova
// geração da versão ATUAL do currículo, enfileirada (nunca processada no
// request). keepEditedSkills: o recrutador confirmou manter as tags que
// editou na geração anterior (sem isso, a nova geração usa as da IA).
export async function requestCandidateAnalysis(
  candidateId: string,
  options: { keepEditedSkills?: boolean } = {}
): Promise<AiActionResult> {
  const session = await requireRole(["ADMIN", "HR"]);

  const candidate = await prisma.candidate.findFirst({
    where: { id: candidateId, companyId: session.companyId },
    select: { currentResumeId: true },
  });
  if (!candidate?.currentResumeId) return { error: "Este candidato ainda não tem currículo." };
  const resumeId = candidate.currentResumeId;

  const latest = await prisma.resumeAnalysis.findFirst({
    where: { resumeId, companyId: session.companyId },
    orderBy: { generation: "desc" },
    select: { id: true, status: true, skillsEditedAt: true },
  });
  if (latest?.status === "PROCESSING") return { error: "Já existe um resumo sendo gerado para este currículo." };

  const result = await prisma.$transaction((tx) =>
    requestResumeAnalysis(tx, taskRegistry, {
      companyId: session.companyId,
      resumeId,
      allowRealData: getAiConfig().allowRealData,
      force: Boolean(latest),
      keepSkillsFrom: options.keepEditedSkills && latest?.skillsEditedAt ? latest.id : undefined,
    })
  );
  if (result.status === "blocked") return { error: AI_BLOCK_REASON_LABELS[result.reason] };

  revalidatePath(`/recrutamento/banco-de-talentos/${candidateId}`);
  return { success: true };
}

const skillsSchema = z
  .array(z.string().trim().min(1, "Tag vazia").max(40, "Tag com mais de 40 caracteres"))
  .max(12, "Máximo de 12 tags");

// Edição manual das tags de competência (adicionar, renomear, remover).
// Marca skillsEditedAt — uma nova geração não sobrescreve sem confirmação.
export async function updateAnalysisSkills(analysisId: string, skills: string[]): Promise<AiActionResult> {
  const session = await requireRole(["ADMIN", "HR"]);

  const parsed = skillsSchema.safeParse(skills);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Tags inválidas." };

  const analysis = await prisma.resumeAnalysis.findFirst({
    where: { id: analysisId, companyId: session.companyId, status: "DONE" },
    select: { resume: { select: { candidateId: true } } },
  });
  if (!analysis) return { error: "Resumo não encontrado." };

  await prisma.resumeAnalysis.update({
    where: { id: analysisId },
    data: { skills: dedupeTags(parsed.data), skillsEditedAt: new Date(), skillsEditedById: session.userId },
  });

  revalidatePath(`/recrutamento/banco-de-talentos/${analysis.resume.candidateId}`);
  revalidatePath("/recrutamento/banco-de-talentos");
  return { success: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import {
  CANDIDATE_STAGES,
  CANDIDATE_TAGS,
  PROCESS_STEPS,
  updateCandidateDadosSchema,
  createCandidateManualSchema,
  type UpdateCandidateDadosInput,
  type CreateCandidateManualInput,
  type ProcessTimeline,
} from "@/schemas/candidate";

export type ActionResult = { error: string } | { success: true };

export async function createCandidateManual(input: CreateCandidateManualInput): Promise<ActionResult> {
  const session = await requireRole(["ADMIN", "HR"]);

  const parsed = createCandidateManualSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;

  const job = await prisma.job.findFirst({ where: { id: data.jobId, companyId: session.companyId } });
  if (!job) return { error: "Vaga não encontrada." };

  await prisma.candidate.create({
    data: {
      companyId: session.companyId,
      jobId: job.id,
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      linkedinUrl: data.linkedinUrl || null,
    },
  });

  revalidatePath("/recrutamento/candidatos");
  revalidatePath(`/recrutamento/vagas/${job.id}`);
  return { success: true };
}

export async function moveCandidateStage(
  candidateId: string,
  stage: (typeof CANDIDATE_STAGES)[number]
): Promise<ActionResult> {
  const session = await requireRole(["ADMIN", "HR"]);

  const candidate = await prisma.candidate.findFirst({ where: { id: candidateId, companyId: session.companyId } });
  if (!candidate) return { error: "Candidato não encontrado." };

  await prisma.candidate.update({
    where: { id: candidateId },
    data: {
      stage,
      hiredAt: stage === "HIRED" && !candidate.hiredAt ? new Date() : undefined,
    },
  });

  revalidatePath("/recrutamento/candidatos");
  revalidatePath(`/recrutamento/candidatos/${candidateId}`);
  return { success: true };
}

// Chamada pelo drag-and-drop do Kanban: move (ou não) o candidato pra
// `toStage` e grava a ordem final da coluna de destino (posição manual).
export async function moveCandidateInKanban(
  candidateId: string,
  toStage: (typeof CANDIDATE_STAGES)[number],
  orderedIdsInStage: string[]
): Promise<ActionResult> {
  const session = await requireRole(["ADMIN", "HR"]);

  const candidate = await prisma.candidate.findFirst({ where: { id: candidateId, companyId: session.companyId } });
  if (!candidate) return { error: "Candidato não encontrado." };

  await prisma.$transaction([
    prisma.candidate.update({
      where: { id: candidateId },
      data: {
        stage: toStage,
        hiredAt: toStage === "HIRED" && !candidate.hiredAt ? new Date() : undefined,
      },
    }),
    ...orderedIdsInStage.map((id, index) =>
      // updateMany (não update) porque {id, companyId} não é uma chave
      // única — e isso também garante que só candidatos desta empresa
      // sejam afetados, mesmo que o payload seja adulterado no cliente.
      prisma.candidate.updateMany({ where: { id, companyId: session.companyId }, data: { position: index } })
    ),
  ]);

  revalidatePath("/recrutamento/candidatos");
  revalidatePath(`/recrutamento/candidatos/${candidateId}`);
  return { success: true };
}

export async function setKanbanStageLabel(
  stage: (typeof CANDIDATE_STAGES)[number],
  label: string
): Promise<ActionResult> {
  const session = await requireRole(["ADMIN", "HR"]);
  const trimmed = label.trim();
  if (!trimmed) return { error: "O título não pode ficar vazio." };

  await prisma.kanbanStageLabel.upsert({
    where: { companyId_stage: { companyId: session.companyId, stage } },
    update: { label: trimmed },
    create: { companyId: session.companyId, stage, label: trimmed },
  });

  revalidatePath("/recrutamento/candidatos");
  return { success: true };
}

export async function setCandidateTag(
  candidateId: string,
  tag: (typeof CANDIDATE_TAGS)[number] | null
): Promise<ActionResult> {
  const session = await requireRole(["ADMIN", "HR"]);

  const candidate = await prisma.candidate.findFirst({ where: { id: candidateId, companyId: session.companyId } });
  if (!candidate) return { error: "Candidato não encontrado." };

  await prisma.candidate.update({ where: { id: candidateId }, data: { qualificationTag: tag } });

  revalidatePath("/recrutamento/candidatos");
  revalidatePath(`/recrutamento/candidatos/${candidateId}`);
  return { success: true };
}

// A timeline é sequencial: marcar uma etapa marca todas as anteriores
// (não dá pra "pular" passos), e desmarcar uma etapa desmarca todas as
// posteriores (não faz sentido manter uma etapa futura concluída se uma
// anterior deixou de estar).
export async function toggleProcessStep(
  candidateId: string,
  step: (typeof PROCESS_STEPS)[number]
): Promise<ActionResult> {
  const session = await requireRole(["ADMIN", "HR"]);

  const candidate = await prisma.candidate.findFirst({ where: { id: candidateId, companyId: session.companyId } });
  if (!candidate) return { error: "Candidato não encontrado." };

  const timeline: ProcessTimeline = { ...((candidate.processSteps as ProcessTimeline | null) ?? {}) };
  const stepIndex = PROCESS_STEPS.indexOf(step);
  const isCurrentlyCompleted = Boolean(timeline[step]);

  if (isCurrentlyCompleted) {
    for (let i = stepIndex; i < PROCESS_STEPS.length; i++) {
      timeline[PROCESS_STEPS[i]] = null;
    }
  } else {
    const now = new Date().toISOString();
    for (let i = 0; i <= stepIndex; i++) {
      if (!timeline[PROCESS_STEPS[i]]) timeline[PROCESS_STEPS[i]] = now;
    }
  }

  await prisma.candidate.update({ where: { id: candidateId }, data: { processSteps: timeline } });

  revalidatePath(`/recrutamento/candidatos/${candidateId}`);
  return { success: true };
}

export async function updateCandidateDados(
  candidateId: string,
  input: UpdateCandidateDadosInput
): Promise<ActionResult> {
  const session = await requireRole(["ADMIN", "HR"]);

  const parsed = updateCandidateDadosSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const candidate = await prisma.candidate.findFirst({ where: { id: candidateId, companyId: session.companyId } });
  if (!candidate) return { error: "Candidato não encontrado." };

  await prisma.candidate.update({
    where: { id: candidateId },
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      linkedinUrl: parsed.data.linkedinUrl || null,
    },
  });

  revalidatePath(`/recrutamento/candidatos/${candidateId}`);
  return { success: true };
}

export async function addCandidateNote(candidateId: string, note: string): Promise<ActionResult> {
  const session = await requireRole(["ADMIN", "HR"]);
  if (!note.trim()) return { error: "Escreva algo antes de salvar." };

  const candidate = await prisma.candidate.findFirst({ where: { id: candidateId, companyId: session.companyId } });
  if (!candidate) return { error: "Candidato não encontrado." };

  const stamp = new Date().toLocaleString("pt-BR");
  const entry = `[${stamp}] ${note.trim()}`;
  const notes = candidate.notes ? `${candidate.notes}\n${entry}` : entry;

  await prisma.candidate.update({ where: { id: candidateId }, data: { notes } });

  revalidatePath(`/recrutamento/candidatos/${candidateId}`);
  return { success: true };
}

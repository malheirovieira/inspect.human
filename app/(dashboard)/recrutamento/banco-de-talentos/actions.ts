"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { logApplicationEvent } from "@/services/applicationEvents";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  CANDIDATE_STAGES,
  CANDIDATE_TAGS,
  updateCandidateDadosSchema,
  createCandidateManualSchema,
  type UpdateCandidateDadosInput,
  type CreateCandidateManualInput,
} from "@/schemas/candidate";

export type ActionResult = { error: string } | { success: true };

const RESUME_BUCKET = "resumes";
const MAX_RESUME_BYTES = 5 * 1024 * 1024;

// Candidate é a pessoa, reaproveitada entre candidaturas — antes de criar
// uma nova, procura por e-mail dentro da empresa. Sem constraint de unicidade
// no banco (dois cadastros simultâneos com o mesmo e-mail podem gerar duas
// linhas em teoria), aceitável por ora.
async function findOrCreateCandidate(
  companyId: string,
  data: { name: string; email: string; phone: string | null; linkedinUrl: string | null }
) {
  const existing = await prisma.candidate.findFirst({ where: { companyId, email: data.email } });
  if (existing) return existing;
  return prisma.candidate.create({ data: { companyId, ...data } });
}

export async function createCandidateManual(input: CreateCandidateManualInput): Promise<ActionResult> {
  const session = await requireRole(["ADMIN", "HR"]);

  const parsed = createCandidateManualSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;

  const job = await prisma.job.findFirst({ where: { id: data.jobId, companyId: session.companyId } });
  if (!job) return { error: "Vaga não encontrada." };

  const candidate = await findOrCreateCandidate(session.companyId, {
    name: data.name,
    email: data.email,
    phone: data.phone || null,
    linkedinUrl: data.linkedinUrl || null,
  });

  const application = await prisma.application.create({
    data: { companyId: session.companyId, candidateId: candidate.id, jobId: job.id },
  });

  await logApplicationEvent({
    companyId: session.companyId,
    applicationId: application.id,
    type: "APPLICATION_CREATED",
    payload: { source: "MANUAL" },
    actorId: session.userId,
  });

  revalidatePath("/recrutamento/banco-de-talentos");
  revalidatePath(`/recrutamento/vagas/${job.id}`);
  return { success: true };
}

// applicationId (parâmetro chamado assim nas funções abaixo que operam na
// candidatura, não na pessoa). Revalida as duas telas que mostram a
// etapa: a vaga (Kanban) e o detalhe da candidatura — pra nenhuma ficar com
// dado desatualizado depois de mover por qualquer um dos dois lados.
export async function moveCandidateStage(
  applicationId: string,
  stage: (typeof CANDIDATE_STAGES)[number]
): Promise<ActionResult> {
  const session = await requireRole(["ADMIN", "HR"]);

  const application = await prisma.application.findFirst({ where: { id: applicationId, companyId: session.companyId } });
  if (!application) return { error: "Candidato não encontrado." };

  await prisma.application.update({
    where: { id: applicationId },
    data: {
      stage,
      hiredAt: stage === "HIRED" && !application.hiredAt ? new Date() : undefined,
    },
  });

  if (application.stage !== stage) {
    await logApplicationEvent({
      companyId: session.companyId,
      applicationId,
      type: "STAGE_CHANGED",
      payload: { from: application.stage, to: stage },
      actorId: session.userId,
    });
  }

  revalidatePath("/recrutamento/banco-de-talentos");
  revalidatePath(`/recrutamento/vagas/${application.jobId}`);
  revalidatePath(`/recrutamento/vagas/${application.jobId}/candidaturas/${applicationId}`);
  return { success: true };
}

// Chamada pelo drag-and-drop do Kanban: move (ou não) o candidato pra
// `toStage` e grava a ordem final da coluna de destino (posição manual).
export async function moveCandidateInKanban(
  applicationId: string,
  toStage: (typeof CANDIDATE_STAGES)[number],
  orderedIdsInStage: string[]
): Promise<ActionResult> {
  const session = await requireRole(["ADMIN", "HR"]);

  const application = await prisma.application.findFirst({ where: { id: applicationId, companyId: session.companyId } });
  if (!application) return { error: "Candidato não encontrado." };

  await prisma.$transaction([
    prisma.application.update({
      where: { id: applicationId },
      data: {
        stage: toStage,
        hiredAt: toStage === "HIRED" && !application.hiredAt ? new Date() : undefined,
      },
    }),
    ...orderedIdsInStage.map((id, index) =>
      // updateMany (não update) porque {id, companyId} não é uma chave
      // única — e isso também garante que só candidaturas desta empresa
      // sejam afetadas, mesmo que o payload seja adulterado no cliente.
      prisma.application.updateMany({ where: { id, companyId: session.companyId }, data: { position: index } })
    ),
  ]);

  // Só registra evento quando a etapa de fato muda — reordenar dentro da
  // mesma coluna não é um evento interessante pro histórico.
  if (application.stage !== toStage) {
    await logApplicationEvent({
      companyId: session.companyId,
      applicationId,
      type: "STAGE_CHANGED",
      payload: { from: application.stage, to: toStage },
      actorId: session.userId,
    });
  }

  revalidatePath("/recrutamento/banco-de-talentos");
  revalidatePath(`/recrutamento/vagas/${application.jobId}`);
  revalidatePath(`/recrutamento/vagas/${application.jobId}/candidaturas/${applicationId}`);
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

  revalidatePath("/recrutamento/banco-de-talentos");
  return { success: true };
}

export async function setCandidateTag(
  applicationId: string,
  tag: (typeof CANDIDATE_TAGS)[number] | null
): Promise<ActionResult> {
  const session = await requireRole(["ADMIN", "HR"]);

  const application = await prisma.application.findFirst({ where: { id: applicationId, companyId: session.companyId } });
  if (!application) return { error: "Candidato não encontrado." };

  await prisma.application.update({ where: { id: applicationId }, data: { qualificationTag: tag } });

  if (application.qualificationTag !== tag) {
    await logApplicationEvent({
      companyId: session.companyId,
      applicationId,
      type: "TAG_CHANGED",
      payload: { from: application.qualificationTag, to: tag },
      actorId: session.userId,
    });
  }

  revalidatePath(`/recrutamento/vagas/${application.jobId}`);
  revalidatePath(`/recrutamento/vagas/${application.jobId}/candidaturas/${applicationId}`);
  return { success: true };
}

// Anotação da candidatura — vira só um evento (NOTE_ADDED) na timeline,
// não escreve mais em Candidate (a pessoa pode ter outras candidaturas, a
// anotação é sobre ESTE processo específico).
export async function addApplicationNote(applicationId: string, note: string): Promise<ActionResult> {
  const session = await requireRole(["ADMIN", "HR"]);
  const trimmed = note.trim();
  if (!trimmed) return { error: "Escreva algo antes de salvar." };

  const application = await prisma.application.findFirst({ where: { id: applicationId, companyId: session.companyId } });
  if (!application) return { error: "Candidato não encontrado." };

  await logApplicationEvent({
    companyId: session.companyId,
    applicationId,
    type: "NOTE_ADDED",
    payload: { note: trimmed },
    actorId: session.userId,
  });

  revalidatePath(`/recrutamento/vagas/${application.jobId}/candidaturas/${applicationId}`);
  return { success: true };
}

// candidateId aqui é o id de verdade do Candidate (a pessoa) — a aba
// Perfil já resolve isso direto, sem precisar passar por uma Application.
export async function updateCandidateDados(candidateId: string, input: UpdateCandidateDadosInput): Promise<ActionResult> {
  const session = await requireRole(["ADMIN", "HR"]);

  const parsed = updateCandidateDadosSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { count } = await prisma.candidate.updateMany({
    where: { id: candidateId, companyId: session.companyId },
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      linkedinUrl: parsed.data.linkedinUrl || null,
    },
  });
  if (count === 0) return { error: "Candidato não encontrado." };

  revalidatePath(`/recrutamento/banco-de-talentos/${candidateId}`);
  return { success: true };
}

// Upload de currículo pelo recrutador (aba Perfil) — mesmo bucket privado e
// mesmo padrão de path da candidatura pública (empresa/pessoa.pdf), só que
// iniciado manualmente em vez de vir junto do formulário público.
export async function uploadCandidateResume(candidateId: string, formData: FormData): Promise<ActionResult> {
  const session = await requireRole(["ADMIN", "HR"]);

  const candidate = await prisma.candidate.findFirst({ where: { id: candidateId, companyId: session.companyId } });
  if (!candidate) return { error: "Candidato não encontrado." };

  const file = formData.get("resume");
  if (!(file instanceof File) || file.size === 0) return { error: "Selecione um arquivo." };
  if (file.type !== "application/pdf") return { error: "O currículo precisa ser um arquivo PDF." };
  if (file.size > MAX_RESUME_BYTES) return { error: "O PDF do currículo precisa ter até 5MB." };

  const path = `${session.companyId}/${candidate.id}.pdf`;
  const supabaseAdmin = createSupabaseAdminClient();
  const { error: uploadError } = await supabaseAdmin.storage
    .from(RESUME_BUCKET)
    .upload(path, file, { contentType: "application/pdf", upsert: true });
  if (uploadError) return { error: "Falha ao enviar o arquivo. Tente novamente." };

  await prisma.candidate.update({ where: { id: candidateId }, data: { resumePath: path } });

  revalidatePath(`/recrutamento/banco-de-talentos/${candidateId}`);
  return { success: true };
}

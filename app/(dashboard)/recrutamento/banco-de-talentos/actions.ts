"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { logApplicationEvent } from "@/services/applicationEvents";
import { zodFieldErrors, type FieldErrors } from "@/lib/fieldErrors";
import { validateResumeFile } from "@/lib/resumes/files";
import { storeResumeVersion } from "@/lib/resumes/storeResumeVersion";
import {
  CANDIDATE_STAGES,
  CANDIDATE_TAGS,
  updateCandidateDadosSchema,
  createCandidateManualSchema,
  type UpdateCandidateDadosInput,
  type CreateCandidateManualInput,
} from "@/schemas/candidate";

export type ActionResult = { error: string } | { success: true };

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

// Só avança de Triagem pra próxima etapa se a tag for GREEN ("Perfil
// compatível") — sem isso, qualquer tentativa de avançar (checklist OU
// Kanban, mesma regra pros dois) reprova automaticamente em vez de mover
// pra etapa pedida. Não se aplica indo PRA Triagem ou já reprovando.
function resolveTargetStage(
  application: { stage: string; qualificationTag: string | null },
  requested: (typeof CANDIDATE_STAGES)[number]
): (typeof CANDIDATE_STAGES)[number] {
  const leavingTriageForward = application.stage === "TRIAGE" && requested !== "TRIAGE" && requested !== "REJECTED";
  if (leavingTriageForward && application.qualificationTag !== "GREEN") {
    return "REJECTED";
  }
  return requested;
}

// applicationId (parâmetro chamado assim nas funções abaixo que operam na
// candidatura, não na pessoa). Revalida as duas telas que mostram a
// etapa: a vaga (Kanban) e o detalhe da candidatura — pra nenhuma ficar com
// dado desatualizado depois de mover por qualquer um dos dois lados.
export async function moveCandidateStage(
  applicationId: string,
  requestedStage: (typeof CANDIDATE_STAGES)[number]
): Promise<ActionResult> {
  const session = await requireRole(["ADMIN", "HR"]);

  const application = await prisma.application.findFirst({ where: { id: applicationId, companyId: session.companyId } });
  if (!application) return { error: "Candidato não encontrado." };

  const stage = resolveTargetStage(application, requestedStage);

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

  const finalStage = resolveTargetStage(application, toStage);

  await prisma.$transaction([
    prisma.application.update({
      where: { id: applicationId },
      data: {
        stage: finalStage,
        hiredAt: finalStage === "HIRED" && !application.hiredAt ? new Date() : undefined,
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
  if (application.stage !== finalStage) {
    await logApplicationEvent({
      companyId: session.companyId,
      applicationId,
      type: "STAGE_CHANGED",
      payload: { from: application.stage, to: finalStage },
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

export type SetTagResult = { error: string } | { success: true; stage: (typeof CANDIDATE_STAGES)[number] };

// A reprovação por tag é feita AQUI (não só no client) de propósito: se
// dependesse do componente fazer duas chamadas em sequência (tag + depois
// mover etapa), qualquer outro caminho que chame setCandidateTag deixaria
// a candidatura com tag "Perfil incompatível" e etapa não-REJECTED — exatamente
// o estado inconsistente que já aconteceu uma vez. Aqui é uma escrita só,
// atômica: não tem como setar a tag sem a etapa acompanhar.
export async function setCandidateTag(
  applicationId: string,
  tag: (typeof CANDIDATE_TAGS)[number] | null
): Promise<SetTagResult> {
  const session = await requireRole(["ADMIN", "HR"]);

  const application = await prisma.application.findFirst({ where: { id: applicationId, companyId: session.companyId } });
  if (!application) return { error: "Candidato não encontrado." };

  const finalStage = tag === "RED" ? "REJECTED" : (application.stage as (typeof CANDIDATE_STAGES)[number]);

  await prisma.application.update({ where: { id: applicationId }, data: { qualificationTag: tag, stage: finalStage } });

  if (application.qualificationTag !== tag) {
    await logApplicationEvent({
      companyId: session.companyId,
      applicationId,
      type: "TAG_CHANGED",
      payload: { from: application.qualificationTag, to: tag },
      actorId: session.userId,
    });
  }

  if (application.stage !== finalStage) {
    await logApplicationEvent({
      companyId: session.companyId,
      applicationId,
      type: "STAGE_CHANGED",
      payload: { from: application.stage, to: finalStage },
      actorId: session.userId,
    });
  }

  revalidatePath("/recrutamento/banco-de-talentos");
  revalidatePath(`/recrutamento/vagas/${application.jobId}`);
  revalidatePath(`/recrutamento/vagas/${application.jobId}/candidaturas/${applicationId}`);
  return { success: true, stage: finalStage };
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
//
// Cada atualização que muda algo registra PROFILE_UPDATED na linha do tempo
// de TODAS as candidaturas da pessoa, com os NOMES dos campos alterados
// (nunca os valores — não espalha contato pelo histórico).
export async function updateCandidateDados(
  candidateId: string,
  input: UpdateCandidateDadosInput
): Promise<ActionResult | { error: string; fieldErrors: FieldErrors }> {
  const session = await requireRole(["ADMIN", "HR"]);

  const parsed = updateCandidateDadosSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Corrija os campos destacados.", fieldErrors: zodFieldErrors(parsed.error) };
  }

  const current = await prisma.candidate.findFirst({
    where: { id: candidateId, companyId: session.companyId },
    select: { name: true, email: true, phone: true, linkedinUrl: true, applications: { select: { id: true } } },
  });
  if (!current) return { error: "Candidato não encontrado." };

  const next = {
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone || null,
    linkedinUrl: parsed.data.linkedinUrl || null,
  };
  const changedFields = (Object.keys(next) as (keyof typeof next)[]).filter((k) => (current[k] ?? null) !== next[k]);

  if (changedFields.length > 0) {
    await prisma.$transaction([
      prisma.candidate.update({ where: { id: candidateId }, data: next }),
      prisma.applicationEvent.createMany({
        data: current.applications.map((a) => ({
          companyId: session.companyId,
          applicationId: a.id,
          type: "PROFILE_UPDATED",
          payload: { fields: changedFields },
          actorId: session.userId,
        })),
      }),
    ]);
  }

  revalidatePath(`/recrutamento/banco-de-talentos/${candidateId}`);
  return { success: true };
}

// Upload de currículo pelo recrutador (aba Perfil) — vira a versão ATUAL da
// pessoa (versões anteriores ficam guardadas). Não mexe em
// Application.resumeId: a versão enviada com cada candidatura é histórico.
export async function uploadCandidateResume(candidateId: string, formData: FormData): Promise<ActionResult> {
  const session = await requireRole(["ADMIN", "HR"]);

  const candidate = await prisma.candidate.findFirst({ where: { id: candidateId, companyId: session.companyId } });
  if (!candidate) return { error: "Candidato não encontrado." };

  const file = formData.get("resume");
  if (!(file instanceof File) || file.size === 0) return { error: "Selecione um arquivo." };
  const fileError = validateResumeFile(file);
  if (fileError) return { error: fileError };

  const stored = await storeResumeVersion({
    companyId: session.companyId,
    candidateId,
    file,
    source: "RECRUITER",
    uploadedById: session.userId,
  });
  if (!stored.ok) return { error: stored.error };

  revalidatePath(`/recrutamento/banco-de-talentos/${candidateId}`);
  return { success: true };
}

// Marca/desmarca candidato de TESTE (fictício). Só ADMIN — é o que libera a
// triagem com IA enquanto AI_ALLOW_REAL_DATA=false, então não pode ficar na
// mão de quem só recruta.
export async function setCandidateTestFlag(candidateId: string, isTest: boolean): Promise<ActionResult> {
  const session = await requireRole(["ADMIN"]);

  const { count } = await prisma.candidate.updateMany({
    where: { id: candidateId, companyId: session.companyId },
    data: { isTest },
  });
  if (count === 0) return { error: "Candidato não encontrado." };

  revalidatePath(`/recrutamento/banco-de-talentos/${candidateId}`);
  revalidatePath("/recrutamento/banco-de-talentos");
  return { success: true };
}

// Candidate é a PESSOA, reaproveitada entre candidaturas — apagar aqui
// remove TODAS as candidaturas dela (em qualquer vaga), não só a que está
// sendo vista no momento. Cascade do schema cuida de applications,
// interviews, email_logs, application_events, consents e assessment
// responses; o componente (DeleteCandidateButton) avisa isso no confirm.
export async function deleteCandidate(candidateId: string, jobId: string): Promise<ActionResult> {
  const session = await requireRole(["ADMIN", "HR"]);

  const candidate = await prisma.candidate.findFirst({ where: { id: candidateId, companyId: session.companyId } });
  if (!candidate) return { error: "Candidato não encontrado." };

  await prisma.candidate.delete({ where: { id: candidateId } });

  revalidatePath("/recrutamento/banco-de-talentos");
  revalidatePath(`/recrutamento/vagas/${jobId}`);
  return { success: true };
}

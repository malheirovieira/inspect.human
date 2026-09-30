"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { DISC_QUESTIONS, DISC_DIMENSIONS } from "@/lib/disc/questions";

type ActionResult = { success: true } | { success: false; error: string };

// Cria uma avaliação DISC NOVA (vazia) — antes só existia a padrão, fixa,
// criada via seed. lib/disc/calculate.ts já é genérico o bastante pra
// funcionar com qualquer conjunto de perguntas por dimensão D/I/S/C (não
// depende de serem exatamente 60); avaliações novas focam só no perfil
// comportamental, sem a parte "Competências" (essa é específica do modelo
// original de 60 perguntas).
export async function createDiscAssessment(title: string): Promise<ActionResult & { id?: string }> {
  try {
    const session = await requireRole(["ADMIN", "HR"]);
    const trimmed = title.trim();
    if (!trimmed) return { success: false, error: "Nome da avaliação obrigatório" };

    const assessment = await prisma.discAssessment.create({
      data: { companyId: session.companyId, title: trimmed },
    });

    revalidatePath("/avaliacoes");
    return { success: true, id: assessment.id };
  } catch (err) {
    console.error("[createDiscAssessment]", err);
    return { success: false, error: "Erro ao criar avaliação" };
  }
}

// Sem respostas vinculadas: apaga de verdade. Com respostas: só desativa
// (active=false) — nunca apaga resultado de candidato silenciosamente
// (mesma regra de deleteQuizAssessment).
export async function deleteDiscAssessment(id: string): Promise<ActionResult & { archived?: boolean }> {
  try {
    const session = await requireRole(["ADMIN", "HR"]);

    const owned = await prisma.discAssessment.findFirst({ where: { id, companyId: session.companyId } });
    if (!owned) return { success: false, error: "Avaliação não encontrada" };

    const hasResponses = await prisma.discResponse.findFirst({ where: { assessmentId: id } });
    if (hasResponses) {
      await prisma.discAssessment.update({ where: { id }, data: { active: false } });
      revalidatePath("/avaliacoes");
      return { success: true, archived: true };
    }

    await prisma.discAssessment.delete({ where: { id } });
    revalidatePath("/avaliacoes");
    return { success: true, archived: false };
  } catch (err) {
    console.error("[deleteDiscAssessment]", err);
    return { success: false, error: "Erro ao excluir avaliação" };
  }
}

export async function createDiscQuestion(
  assessmentId: string,
  dimension: (typeof DISC_DIMENSIONS)[number],
  text: string
): Promise<ActionResult> {
  try {
    const session = await requireRole(["ADMIN", "HR"]);
    const trimmed = text.trim();
    if (!trimmed) return { success: false, error: "Texto não pode ser vazio" };
    if (trimmed.length < 10) return { success: false, error: "Texto muito curto" };

    const assessment = await prisma.discAssessment.findFirst({
      where: { id: assessmentId, companyId: session.companyId },
      include: { questions: { select: { id: true } } },
    });
    if (!assessment) return { success: false, error: "Avaliação não encontrada" };

    await prisma.discQuestion.create({
      data: {
        assessmentId,
        position: assessment.questions.length + 1,
        section: "DISC",
        dimension,
        text: trimmed,
      },
    });

    revalidatePath("/avaliacoes");
    return { success: true };
  } catch (err) {
    console.error("[createDiscQuestion]", err);
    return { success: false, error: "Erro ao adicionar pergunta" };
  }
}

export async function deleteDiscQuestion(questionId: string): Promise<ActionResult> {
  try {
    const session = await requireRole(["ADMIN", "HR"]);

    const question = await prisma.discQuestion.findUnique({
      where: { id: questionId },
      include: { assessment: { select: { companyId: true } } },
    });
    if (!question || question.assessment.companyId !== session.companyId) {
      return { success: false, error: "Pergunta não encontrada" };
    }

    await prisma.discQuestion.delete({ where: { id: questionId } });
    revalidatePath("/avaliacoes");
    return { success: true };
  } catch (err) {
    console.error("[deleteDiscQuestion]", err);
    return { success: false, error: "Erro ao excluir pergunta" };
  }
}

// Edita o texto de uma das 60 afirmações fixas — afeta só avaliações
// futuras: disc_answers já gravadas referenciam question_id, não guardam o
// texto, então respostas antigas continuam associadas à pergunta como ela
// era, sem precisar de histórico/versionamento à parte.
export async function updateDiscQuestion(questionId: string, text: string): Promise<ActionResult> {
  try {
    const session = await requireRole(["ADMIN", "HR"]);

    const trimmed = text.trim();
    if (!trimmed) return { success: false, error: "Texto não pode ser vazio" };
    if (trimmed.length < 10) return { success: false, error: "Texto muito curto" };

    const question = await prisma.discQuestion.findUnique({
      where: { id: questionId },
      include: { assessment: { select: { companyId: true } } },
    });
    if (!question) return { success: false, error: "Pergunta não encontrada" };
    if (question.assessment.companyId !== session.companyId) {
      return { success: false, error: "Sem permissão para editar esta pergunta" };
    }

    await prisma.discQuestion.update({ where: { id: questionId }, data: { text: trimmed } });

    revalidatePath("/recrutamento/disc/perguntas");
    return { success: true };
  } catch (err) {
    console.error("[updateDiscQuestion]", err);
    return { success: false, error: "Erro ao salvar" };
  }
}

// Restaura as 60 afirmações da empresa pro texto original de lib/disc/questions.ts.
export async function resetDiscQuestions(): Promise<ActionResult> {
  try {
    const session = await requireRole(["ADMIN", "HR"]);

    const assessment = await prisma.discAssessment.findFirst({
      where: { companyId: session.companyId },
      include: { questions: { select: { id: true, position: true } } },
    });
    if (!assessment) return { success: false, error: "Avaliação DISC não encontrada" };

    const updates = DISC_QUESTIONS.map((original) => {
      const question = assessment.questions.find((q) => q.position === original.position);
      if (!question) return null;
      return prisma.discQuestion.update({ where: { id: question.id }, data: { text: original.text } });
    }).filter((update): update is NonNullable<typeof update> => update !== null);

    await prisma.$transaction(updates);

    revalidatePath("/recrutamento/disc/perguntas");
    return { success: true };
  } catch (err) {
    console.error("[resetDiscQuestions]", err);
    return { success: false, error: "Erro ao restaurar" };
  }
}

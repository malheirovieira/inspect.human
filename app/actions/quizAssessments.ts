"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

type ActionResult = { success: true } | { success: false; error: string };

export type QuizQuestionInput = {
  text: string;
  maxScore: number;
  choices: { text: string; isCorrect: boolean }[];
};

// Cria uma avaliação vazia (recrutador adiciona perguntas depois, na tela de
// edição) — scored decide se é "Pontuação" (múltipla escolha com gabarito)
// ou "Sem pontuação" (só coleta a escolha).
export async function createQuizAssessment(title: string, scored: boolean): Promise<ActionResult & { id?: string }> {
  try {
    const session = await requireRole(["ADMIN", "HR"]);

    const trimmed = title.trim();
    if (!trimmed) return { success: false, error: "Nome da avaliação obrigatório" };

    const assessment = await prisma.quizAssessment.create({
      data: { companyId: session.companyId, title: trimmed, scored },
    });

    revalidatePath("/avaliacoes");
    return { success: true, id: assessment.id };
  } catch (err) {
    console.error("[createQuizAssessment]", err);
    return { success: false, error: "Erro ao criar avaliação" };
  }
}

export async function updateQuizAssessmentTitle(id: string, title: string): Promise<ActionResult> {
  try {
    const session = await requireRole(["ADMIN", "HR"]);
    const trimmed = title.trim();
    if (!trimmed) return { success: false, error: "Nome não pode ser vazio" };

    const owned = await prisma.quizAssessment.findFirst({ where: { id, companyId: session.companyId } });
    if (!owned) return { success: false, error: "Avaliação não encontrada" };

    await prisma.quizAssessment.update({ where: { id }, data: { title: trimmed } });
    revalidatePath("/avaliacoes");
    return { success: true };
  } catch (err) {
    console.error("[updateQuizAssessmentTitle]", err);
    return { success: false, error: "Erro ao atualizar" };
  }
}

// Sem respostas vinculadas: apaga de verdade. Com respostas: só desativa
// (active=false) — nunca apaga resultado de candidato silenciosamente.
export async function deleteQuizAssessment(id: string): Promise<ActionResult & { archived?: boolean }> {
  try {
    const session = await requireRole(["ADMIN", "HR"]);

    const owned = await prisma.quizAssessment.findFirst({ where: { id, companyId: session.companyId } });
    if (!owned) return { success: false, error: "Avaliação não encontrada" };

    const hasResponses = await prisma.quizResponse.findFirst({ where: { assessmentId: id } });
    if (hasResponses) {
      await prisma.quizAssessment.update({ where: { id }, data: { active: false } });
      revalidatePath("/avaliacoes");
      return { success: true, archived: true };
    }

    await prisma.quizAssessment.delete({ where: { id } });
    revalidatePath("/avaliacoes");
    return { success: true, archived: false };
  } catch (err) {
    console.error("[deleteQuizAssessment]", err);
    return { success: false, error: "Erro ao excluir avaliação" };
  }
}

export async function addQuizQuestion(assessmentId: string, input: QuizQuestionInput): Promise<ActionResult> {
  try {
    const session = await requireRole(["ADMIN", "HR"]);

    const assessment = await prisma.quizAssessment.findFirst({
      where: { id: assessmentId, companyId: session.companyId },
      include: { questions: { select: { id: true } } },
    });
    if (!assessment) return { success: false, error: "Avaliação não encontrada" };

    const text = input.text.trim();
    if (!text) return { success: false, error: "Texto da pergunta obrigatório" };
    if (input.choices.length < 2) return { success: false, error: "A pergunta precisa de ao menos 2 opções" };
    if (assessment.scored && !input.choices.some((c) => c.isCorrect)) {
      return { success: false, error: "Marque qual opção é a correta" };
    }

    await prisma.quizQuestion.create({
      data: {
        companyId: session.companyId,
        assessmentId,
        position: assessment.questions.length,
        text,
        maxScore: input.maxScore || 1,
        choices: {
          create: input.choices.map((c, idx) => ({
            companyId: session.companyId,
            position: idx,
            text: c.text.trim(),
            isCorrect: assessment.scored ? c.isCorrect : false,
          })),
        },
      },
    });

    revalidatePath("/avaliacoes");
    return { success: true };
  } catch (err) {
    console.error("[addQuizQuestion]", err);
    return { success: false, error: "Erro ao adicionar pergunta" };
  }
}

export async function deleteQuizQuestion(questionId: string): Promise<ActionResult> {
  try {
    const session = await requireRole(["ADMIN", "HR"]);

    const question = await prisma.quizQuestion.findFirst({ where: { id: questionId, companyId: session.companyId } });
    if (!question) return { success: false, error: "Pergunta não encontrada" };

    await prisma.quizQuestion.delete({ where: { id: questionId } });
    revalidatePath("/avaliacoes");
    return { success: true };
  } catch (err) {
    console.error("[deleteQuizQuestion]", err);
    return { success: false, error: "Erro ao excluir pergunta" };
  }
}

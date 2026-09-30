"use server";

import { prisma } from "@/lib/prisma";
import { calculateQuizResult } from "@/lib/quiz/calculate";

type SubmitQuizResult = { success: false; error: string } | { success: true; score: number | null; maxScore: number | null };

// Rota pública (candidato sem login) — mesmo padrão de segurança do DISC:
// o cliente só manda "pergunta X, escolhi a opção Y", nunca uma nota. Certo/
// errado e pontuação vêm sempre do banco, nunca do payload do navegador.
export async function submitQuizAssessment(
  token: string,
  answers: Record<string, string>
): Promise<SubmitQuizResult> {
  if (!token) return { success: false, error: "Token inválido" };
  if (!answers || Object.keys(answers).length === 0) return { success: false, error: "Nenhuma resposta fornecida" };

  try {
    const response = await prisma.quizResponse.findUnique({
      where: { token },
      include: { assessment: true },
    });
    if (!response) return { success: false, error: "Link não encontrado" };
    if (response.submittedAt) return { success: false, error: "Este questionário já foi respondido" };
    if (response.expiresAt < new Date()) return { success: false, error: "Link expirado" };

    const questions = await prisma.quizQuestion.findMany({
      where: { assessmentId: response.assessmentId },
      include: { choices: true },
    });

    if (Object.keys(answers).length !== questions.length) {
      return { success: false, error: "Nem todas as perguntas foram respondidas" };
    }

    const answersToInsert: { companyId: string; responseId: string; questionId: string; choiceId: string; score: number }[] = [];
    const answersForCalc: { questionId: string; choiceId: string; isCorrect: boolean; maxScore: number }[] = [];

    for (const [questionId, choiceId] of Object.entries(answers)) {
      const question = questions.find((q) => q.id === questionId);
      if (!question) return { success: false, error: "Pergunta inválida" };
      const choice = question.choices.find((c) => c.id === choiceId);
      if (!choice) return { success: false, error: "Opção inválida" };

      const isCorrect = response.assessment.scored && choice.isCorrect;
      const score = isCorrect ? question.maxScore : 0;
      answersToInsert.push({ companyId: response.companyId, responseId: response.id, questionId, choiceId, score });
      answersForCalc.push({ questionId, choiceId, isCorrect, maxScore: question.maxScore });
    }

    const result = response.assessment.scored ? calculateQuizResult(answersForCalc) : { score: null, maxScore: null };

    await prisma.$transaction([
      prisma.quizAnswer.createMany({ data: answersToInsert }),
      prisma.quizResponse.update({
        where: { id: response.id },
        data: { submittedAt: new Date(), score: result.score, maxScore: result.maxScore },
      }),
      prisma.applicationEvent.create({
        data: {
          companyId: response.companyId,
          applicationId: response.applicationId,
          type: "QUIZ_SUBMITTED",
          payload: { assessmentTitle: response.assessment.title, score: result.score, maxScore: result.maxScore },
        },
      }),
    ]);

    return { success: true, score: result.score, maxScore: result.maxScore };
  } catch (err) {
    console.error("[submitQuizAssessment]", err);
    return { success: false, error: "Erro interno do servidor" };
  }
}

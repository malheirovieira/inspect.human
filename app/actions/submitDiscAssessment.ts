"use server";

import { prisma } from "@/lib/prisma";
import { calculateDiscResult, type DiscAnswerInput } from "@/lib/disc/calculate";

type SubmitDiscResult =
  | { success: false; error: string }
  | { success: true; result: ReturnType<typeof calculateDiscResult> };

// Rota pública (candidato sem login) — mesmo padrão de segurança de
// submitAssessment.ts: nunca confia em nada vindo do cliente além de
// "pergunta X recebeu nota Y". As dimensões/seções usadas no cálculo vêm
// sempre do banco, nunca do payload do navegador.
export async function submitDiscAssessment(
  token: string,
  answers: Record<string, number>
): Promise<SubmitDiscResult> {
  if (!token) {
    return { success: false, error: "Token inválido" };
  }
  if (!answers || Object.keys(answers).length === 0) {
    return { success: false, error: "Nenhuma resposta fornecida" };
  }

  try {
    const response = await prisma.discResponse.findUnique({ where: { token } });
    if (!response) {
      return { success: false, error: "Link não encontrado" };
    }
    if (response.submittedAt) {
      return { success: false, error: "Este questionário já foi respondido" };
    }
    if (response.expiresAt < new Date()) {
      return { success: false, error: "Link expirado" };
    }

    const questions = await prisma.discQuestion.findMany({
      where: { assessmentId: response.assessmentId },
    });

    const questionIds = new Set(questions.map((q) => q.id));
    const answerIds = Object.keys(answers);

    if (answerIds.length !== questions.length) {
      return { success: false, error: "Nem todas as afirmações foram respondidas" };
    }

    const answersToInsert: { companyId: string; responseId: string; questionId: string; score: number }[] = [];
    const answersForCalc: DiscAnswerInput[] = [];

    for (const questionId of answerIds) {
      const question = questions.find((q) => q.id === questionId);
      if (!question || !questionIds.has(questionId)) {
        return { success: false, error: "Pergunta inválida fornecida" };
      }
      const score = answers[questionId];
      if (!Number.isInteger(score) || score < 1 || score > 5) {
        return { success: false, error: "Nota inválida — use de 1 a 5" };
      }
      answersToInsert.push({ companyId: response.companyId, responseId: response.id, questionId, score });
      answersForCalc.push({ dimension: question.dimension, section: question.section as "COMPETENCIAS" | "DISC", score });
    }

    const result = calculateDiscResult(answersForCalc);

    await prisma.$transaction([
      prisma.discAnswer.createMany({ data: answersToInsert }),
      prisma.discResponse.update({
        where: { id: response.id },
        data: { submittedAt: new Date(), ...result },
      }),
      prisma.applicationEvent.create({
        data: {
          companyId: response.companyId,
          applicationId: response.applicationId,
          type: "DISC_SUBMITTED",
          payload: { perfilDisc: result.perfilDisc, scoreGeral: result.scoreGeral, nivelGeral: result.nivelGeral },
          actorId: null,
        },
      }),
    ]);

    return { success: true, result };
  } catch (err) {
    console.error("[submitDiscAssessment]", err);
    return { success: false, error: "Erro interno do servidor" };
  }
}

"use server";

import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

function generateToken(): string {
  return randomUUID().replace(/-/g, "");
}

type GenerateQuizLinkResult = { success: false; error: string } | { success: true; token: string };

export async function generateQuizLink(applicationId: string, assessmentId: string): Promise<GenerateQuizLinkResult> {
  try {
    const session = await requireRole(["ADMIN", "HR"]);

    const application = await prisma.application.findFirst({
      where: { id: applicationId, companyId: session.companyId },
    });
    if (!application) {
      return { success: false, error: "Candidatura não encontrada" };
    }

    const assessment = await prisma.quizAssessment.findFirst({
      where: { id: assessmentId, companyId: session.companyId, active: true },
      include: { questions: { select: { id: true } } },
    });
    if (!assessment) {
      return { success: false, error: "Avaliação não encontrada" };
    }
    if (assessment.questions.length === 0) {
      return { success: false, error: "Esta avaliação ainda não tem perguntas" };
    }

    const existing = await prisma.quizResponse.findUnique({
      where: { applicationId_assessmentId: { applicationId, assessmentId } },
    });
    if (existing) {
      if (existing.submittedAt) {
        return { success: false, error: "Candidato já respondeu esta avaliação" };
      }
      return { success: true, token: existing.token };
    }

    const response = await prisma.quizResponse.create({
      data: {
        companyId: session.companyId,
        applicationId,
        assessmentId,
        token: generateToken(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { success: true, token: response.token };
  } catch (err) {
    console.error("[generateQuizLink]", err);
    return { success: false, error: "Erro ao gerar link" };
  }
}

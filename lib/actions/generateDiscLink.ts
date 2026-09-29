"use server";

import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

function generateToken(): string {
  // randomUUID() em vez de Math.random() (usado no link de assessment
  // genérico) — token de acesso público merece ser criptograficamente
  // imprevisível.
  return randomUUID().replace(/-/g, "");
}

type GenerateDiscLinkResult = { success: false; error: string } | { success: true; token: string };

export async function generateDiscLink(applicationId: string): Promise<GenerateDiscLinkResult> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Não autenticado" };
    }

    const application = await prisma.application.findFirst({
      where: { id: applicationId, companyId: session.companyId },
    });
    if (!application) {
      return { success: false, error: "Candidatura não encontrada" };
    }

    const assessment = await prisma.discAssessment.findFirst({
      where: { companyId: session.companyId, active: true },
    });
    if (!assessment) {
      return { success: false, error: "Avaliação DISC não encontrada para esta empresa" };
    }

    const existing = await prisma.discResponse.findUnique({ where: { applicationId } });
    if (existing) {
      if (existing.submittedAt) {
        return { success: false, error: "Candidato já respondeu o DISC" };
      }
      // Link já em aberto — devolve o mesmo token em vez de duplicar.
      return { success: true, token: existing.token };
    }

    const response = await prisma.discResponse.create({
      data: {
        companyId: session.companyId,
        applicationId,
        assessmentId: assessment.id,
        token: generateToken(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { success: true, token: response.token };
  } catch (err) {
    console.error("[generateDiscLink]", err);
    return { success: false, error: "Erro ao gerar link" };
  }
}

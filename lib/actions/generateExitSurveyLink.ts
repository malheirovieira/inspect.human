"use server";

import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

function generateToken(): string {
  return randomUUID().replace(/-/g, "");
}

type GenerateExitSurveyLinkResult = { success: false; error: string } | { success: true; token: string };

// Mesmo mecanismo de generateDiscLink.ts: token único, 7 dias de validade,
// devolve o token já existente em vez de duplicar se já houver um link em
// aberto (não respondido) pra este desligamento.
export async function generateExitSurveyLink(employeeExitId: string): Promise<GenerateExitSurveyLinkResult> {
  try {
    const session = await requireRole(["ADMIN", "HR"]);

    const exit = await prisma.employeeExit.findFirst({
      where: { id: employeeExitId, companyId: session.companyId },
    });
    if (!exit) return { success: false, error: "Desligamento não encontrado" };

    const existing = await prisma.exitSurveyResponse.findUnique({ where: { employeeExitId } });
    if (existing) {
      if (existing.submittedAt) return { success: false, error: "Esta pesquisa já foi respondida" };
      return { success: true, token: existing.token };
    }

    const response = await prisma.exitSurveyResponse.create({
      data: {
        companyId: session.companyId,
        employeeExitId,
        token: generateToken(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { success: true, token: response.token };
  } catch (err) {
    console.error("[generateExitSurveyLink]", err);
    return { success: false, error: "Erro ao gerar link" };
  }
}

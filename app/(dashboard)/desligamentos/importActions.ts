"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import {
  validateMappedRow,
  duplicateKey,
  type MappedExitHistoryRow,
} from "@/lib/desligamentos/importExitHistory";

const CHUNK_SIZE = 50;

export type ImportExitHistoryResult = {
  imported: number;
  skippedDuplicates: number;
  errors: { line: number; message: string }[];
};

// Importação de histórico (Fase 4) — cada linha gera um EmployeeExit (criado
// aqui, não exige cadastro prévio do colaborador: é justamente o caso de
// desligamentos de antes do sistema) e, se a planilha trouxer respostas de
// pesquisa, um ExitSurveyResponse já marcado como respondido. Como não há
// consentimento coletado no momento do import, NUNCA cria Consent — a Fase 5
// deve tratar essas respostas como não-elegíveis pra análise de IA mesmo que
// o comentário exista.
export async function importExitHistory(rows: MappedExitHistoryRow[]): Promise<ImportExitHistoryResult> {
  const session = await requireRole(["ADMIN", "HR"]);

  const result: ImportExitHistoryResult = { imported: 0, skippedDuplicates: 0, errors: [] };
  if (rows.length === 0) return result;

  const existing = await prisma.employeeExit.findMany({
    where: { companyId: session.companyId },
    select: { userName: true, exitDate: true },
  });
  const seen = new Set(existing.map((e) => duplicateKey(e.userName, e.exitDate)));

  const toInsert: { line: number; data: Extract<ReturnType<typeof validateMappedRow>, { ok: true }> }[] = [];

  rows.forEach((row, index) => {
    const line = index + 1;
    const validated = validateMappedRow(row);
    if (!validated.ok) {
      result.errors.push({ line, message: validated.error });
      return;
    }

    const key = duplicateKey(validated.employeeExit.userName, validated.employeeExit.exitDate);
    if (seen.has(key)) {
      result.skippedDuplicates += 1;
      return;
    }
    seen.add(key);
    toInsert.push({ line, data: validated });
  });

  for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
    const chunk = toInsert.slice(i, i + CHUNK_SIZE);
    try {
      await prisma.$transaction(async (tx) => {
        for (const item of chunk) {
          const { employeeExit, survey } = item.data;
          const created = await tx.employeeExit.create({
            data: {
              companyId: session.companyId,
              userName: employeeExit.userName,
              department: employeeExit.department,
              position: employeeExit.position,
              admissionDate: employeeExit.admissionDate,
              exitDate: employeeExit.exitDate,
              exitType: employeeExit.exitType,
              reason: employeeExit.reason,
              notes: employeeExit.notes,
              rehireEligible: employeeExit.rehireEligible,
              createdById: session.userId,
              dataSource: "manual",
            },
          });

          if (survey) {
            await tx.exitSurveyResponse.create({
              data: {
                companyId: session.companyId,
                employeeExitId: created.id,
                token: randomUUID().replace(/-/g, ""),
                expiresAt: employeeExit.exitDate,
                submittedAt: employeeExit.exitDate,
                leaderName: survey.leaderName,
                environmentScore: survey.environmentScore,
                leaderRelationshipScore: survey.leaderRelationshipScore,
                growthScore: survey.growthScore,
                benefitsScore: survey.benefitsScore,
                communicationScore: survey.communicationScore,
                biggestChallenge: survey.biggestChallenge,
                improvementSuggestion: survey.improvementSuggestion,
                wouldReturn: survey.wouldReturn,
                wouldRecommend: survey.wouldRecommend,
                freeComment: survey.freeComment,
                dataSource: "manual",
              },
            });
          }
        }
      });
      result.imported += chunk.length;
    } catch (err) {
      console.error("[importExitHistory] falha ao gravar lote", err);
      for (const item of chunk) {
        result.errors.push({ line: item.line, message: "Erro ao gravar no banco de dados" });
      }
    }
  }

  revalidatePath("/desligamentos");
  revalidatePath("/gestao/kpis");
  return result;
}

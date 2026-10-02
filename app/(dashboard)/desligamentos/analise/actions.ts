"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { enqueueTask } from "@/lib/tasks/queue";
import { createTaskRegistry } from "@/lib/tasks/registry";
import { TASK_DEFINITIONS } from "@/lib/tasks/handlers";
import { EXIT_THEME_ANALYZE_TASK } from "@/lib/tasks/handlers/exitThemeAnalyze";
import { EXIT_SURVEY_AI_ANALYSIS_CONSENT_PURPOSE } from "@/lib/ai/availability";
import { MIN_THEME_RESPONSES } from "@/lib/exitSurvey/themeAnalysis";
import { getExitAnalysis, getExitAnalysisReport, type PeriodInput } from "@/services/exitAnalysis";

const registry = createTaskRegistry(TASK_DEFINITIONS);

export async function fetchExitAnalysis(current: PeriodInput, previous: PeriodInput | null, minVolume: number) {
  return getExitAnalysis(current, previous, minVolume);
}

export async function fetchExitAnalysisReport(period: PeriodInput) {
  return getExitAnalysisReport(period);
}

export type SaveRecommendationsResult = { success: true } | { success: false; error: string };

export async function saveExitAnalysisRecommendations(period: PeriodInput, text: string): Promise<SaveRecommendationsResult> {
  const session = await requireRole(["ADMIN", "HR"]);
  const periodFrom = new Date(period.from);
  const periodTo = new Date(period.to);

  await prisma.exitAnalysisReport.upsert({
    where: { companyId_periodFrom_periodTo: { companyId: session.companyId, periodFrom, periodTo } },
    create: {
      companyId: session.companyId,
      periodFrom,
      periodTo,
      recommendations: text,
      recommendationsUpdatedAt: new Date(),
      recommendationsUpdatedById: session.userId,
    },
    update: {
      recommendations: text,
      recommendationsUpdatedAt: new Date(),
      recommendationsUpdatedById: session.userId,
    },
  });

  return { success: true };
}

export type RequestThemeAnalysisResult =
  | { status: "queued" }
  | { status: "insufficient"; count: number; required: number }
  | { status: "error"; error: string };

// Enfileira a análise de tema (Fase 5) só das respostas com Consent ATIVO no
// período — se não houver respostas suficientes, nem enfileira: marca
// INSUFFICIENT_DATA na hora pra interface mostrar o aviso sem esperar a fila.
export async function requestExitThemeAnalysis(period: PeriodInput): Promise<RequestThemeAnalysisResult> {
  const session = await requireRole(["ADMIN", "HR"]);
  const periodFrom = new Date(period.from);
  const periodTo = new Date(period.to);

  const eligibleCount = await prisma.exitSurveyResponse.count({
    where: {
      companyId: session.companyId,
      submittedAt: { gte: periodFrom, lte: periodTo },
      freeComment: { not: null },
      consent: { purpose: EXIT_SURVEY_AI_ANALYSIS_CONSENT_PURPOSE, revokedAt: null },
    },
  });

  const report = await prisma.exitAnalysisReport.upsert({
    where: { companyId_periodFrom_periodTo: { companyId: session.companyId, periodFrom, periodTo } },
    create: { companyId: session.companyId, periodFrom, periodTo },
    update: {},
  });

  if (eligibleCount < MIN_THEME_RESPONSES) {
    await prisma.exitAnalysisReport.update({
      where: { id: report.id },
      data: { themeStatus: "INSUFFICIENT_DATA", themeResponsesAnalyzed: eligibleCount, themeCompletedAt: new Date() },
    });
    return { status: "insufficient", count: eligibleCount, required: MIN_THEME_RESPONSES };
  }

  const requestedAt = new Date();
  await prisma.exitAnalysisReport.update({
    where: { id: report.id },
    data: { themeStatus: "PENDING", themeRequestedAt: requestedAt, themeCompletedAt: null, themeErrorCode: null },
  });

  await enqueueTask(
    prisma,
    registry,
    EXIT_THEME_ANALYZE_TASK,
    { reportId: report.id },
    { companyId: session.companyId, idempotencyKey: `${EXIT_THEME_ANALYZE_TASK}:${report.id}:${requestedAt.toISOString()}` }
  );

  return { status: "queued" };
}

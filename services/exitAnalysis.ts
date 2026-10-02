import "server-only";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { computePeriodMetrics, type ExitAnalysisRow, type PeriodMetrics } from "@/lib/desligamentos/exitAnalysis";

export type PeriodInput = { from: string; to: string };

async function loadRows(companyId: string, period: PeriodInput): Promise<ExitAnalysisRow[]> {
  const from = new Date(period.from);
  const to = new Date(period.to);

  const exits = await prisma.employeeExit.findMany({
    where: { companyId, exitDate: { gte: from, lte: to } },
    select: {
      exitDate: true,
      exitType: true,
      reason: true,
      department: true,
      notes: true,
      surveyResponse: {
        select: {
          submittedAt: true,
          leaderName: true,
          environmentScore: true,
          leaderRelationshipScore: true,
          growthScore: true,
          benefitsScore: true,
          communicationScore: true,
          biggestChallenge: true,
          improvementSuggestion: true,
          wouldReturn: true,
          wouldRecommend: true,
        },
      },
    },
  });

  return exits.map((exit) => {
    const survey = exit.surveyResponse && exit.surveyResponse.submittedAt ? exit.surveyResponse : null;
    return {
      exitDate: exit.exitDate,
      exitType: exit.exitType,
      reason: exit.reason,
      notes: exit.notes,
      department: exit.department,
      hasSurveyResponse: survey !== null,
      leaderName: survey?.leaderName ?? null,
      environmentScore: survey?.environmentScore ?? null,
      leaderRelationshipScore: survey?.leaderRelationshipScore ?? null,
      growthScore: survey?.growthScore ?? null,
      benefitsScore: survey?.benefitsScore ?? null,
      communicationScore: survey?.communicationScore ?? null,
      biggestChallenge: survey?.biggestChallenge ?? null,
      improvementSuggestion: survey?.improvementSuggestion ?? null,
      wouldReturn: survey?.wouldReturn ?? null,
      wouldRecommend: survey?.wouldRecommend ?? null,
    };
  });
}

export type ExitAnalysisResult = {
  current: PeriodMetrics;
  previous: PeriodMetrics | null;
};

// Restrito a ADMIN/HR, isolado por companyId da sessão (nunca recebido do
// cliente) — mesmo padrão de services/employeeExits.ts.
export async function getExitAnalysis(
  currentPeriod: PeriodInput,
  previousPeriod: PeriodInput | null,
  minVolume = 10
): Promise<ExitAnalysisResult> {
  const session = await requireRole(["ADMIN", "HR"]);

  const currentRows = await loadRows(session.companyId, currentPeriod);
  const current = computePeriodMetrics(currentRows, minVolume);

  let previous: PeriodMetrics | null = null;
  if (previousPeriod) {
    const previousRows = await loadRows(session.companyId, previousPeriod);
    previous = computePeriodMetrics(previousRows, minVolume);
  }

  return { current, previous };
}

export async function getExitAnalysisReport(period: PeriodInput) {
  const session = await requireRole(["ADMIN", "HR"]);
  const periodFrom = new Date(period.from);
  const periodTo = new Date(period.to);

  return prisma.exitAnalysisReport.findUnique({
    where: { companyId_periodFrom_periodTo: { companyId: session.companyId, periodFrom, periodTo } },
  });
}

// Período padrão: últimos 12 meses completos (inclui o mês corrente até
// hoje) comparado com os 12 meses imediatamente anteriores.
export function defaultPeriods(): { current: PeriodInput; previous: PeriodInput } {
  const today = new Date();
  const to = today.toISOString().slice(0, 10);
  const from = new Date(Date.UTC(today.getUTCFullYear() - 1, today.getUTCMonth(), today.getUTCDate() + 1))
    .toISOString()
    .slice(0, 10);
  const previousTo = new Date(Date.UTC(today.getUTCFullYear() - 1, today.getUTCMonth(), today.getUTCDate()))
    .toISOString()
    .slice(0, 10);
  const previousFrom = new Date(Date.UTC(today.getUTCFullYear() - 2, today.getUTCMonth(), today.getUTCDate() + 1))
    .toISOString()
    .slice(0, 10);
  return { current: { from, to }, previous: { from: previousFrom, to: previousTo } };
}

import "server-only";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { getBudgetSummary } from "@/services/budget";

function periodFromCompetence(competence: string) {
  const [year, month] = competence.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { start, end };
}

function daysBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / 86_400_000;
}

export async function getHrKpis(competence: string) {
  const session = await requireRole(["ADMIN", "HR"]);
  const { companyId } = session;
  const { start, end } = periodFromCompetence(competence);

  const [hiredCandidates, allUsers, allExits, exitsInPeriod, admissionsInPeriod, candidatesInPeriod, budgetSummary] =
    await Promise.all([
      prisma.candidate.findMany({
        where: { companyId, hiredAt: { gte: start, lt: end } },
        include: { job: { select: { publishedAt: true, title: true } } },
      }),
      prisma.user.findMany({
        where: { companyId },
        select: { id: true, admissionDate: true, active: true, salary: true },
      }),
      prisma.employeeExit.findMany({ where: { companyId } }),
      prisma.employeeExit.findMany({ where: { companyId, exitDate: { gte: start, lt: end } } }),
      prisma.user.count({ where: { companyId, admissionDate: { gte: start, lt: end } } }),
      prisma.candidate.findMany({ where: { companyId, createdAt: { gte: start, lt: end } }, select: { stage: true } }),
      getBudgetSummary(competence),
    ]);

  // ---- 1. Time-to-hire: média de dias entre a vaga ser publicada e o
  // candidato virar HIRED, para contratações feitas neste mês.
  const timeToHireSamples = hiredCandidates
    .filter((c) => c.job.publishedAt && c.hiredAt)
    .map((c) => daysBetween(c.job.publishedAt!, c.hiredAt!));
  const timeToHireAvgDays = timeToHireSamples.length
    ? timeToHireSamples.reduce((a, b) => a + b, 0) / timeToHireSamples.length
    : null;

  // ---- 2. Desvio de budget: total consumido / total orçado no mês, somando
  // todos os departamentos e categorias.
  let totalAllocated = 0;
  let totalConsumed = 0;
  for (const dept of budgetSummary) {
    for (const category of Object.keys(dept.categories)) {
      totalAllocated += dept.categories[category].allocated;
      totalConsumed += dept.categories[category].consumed;
    }
  }
  const budgetDeviationPercent = totalAllocated > 0 ? (totalConsumed / totalAllocated) * 100 : null;

  // ---- 3. Turnover: [(demissões + admissões) / 2] / ativos no início do
  // mês. "Ativos no início do mês" = ativos hoje admitidos antes do início,
  // mais quem saiu neste mês ou depois (ainda estava ativo no início dele).
  const exitByUserId = new Map(allExits.filter((e) => e.userId).map((e) => [e.userId as string, e]));
  const activeAtStart = allUsers.filter((u) => {
    if (!u.admissionDate || u.admissionDate >= start) return false;
    if (u.active) return true;
    const exit = exitByUserId.get(u.id);
    return exit ? exit.exitDate >= start : false;
  }).length;
  const turnoverRate =
    activeAtStart > 0 ? (((exitsInPeriod.length + admissionsInPeriod) / 2) / activeAtStart) * 100 : null;

  // ---- 4. Turnover dos primeiros 90 dias: entre quem saiu neste mês,
  // quantos tinham menos de 90 dias de casa.
  const earlyExits = exitsInPeriod.filter(
    (e) => e.admissionDate && daysBetween(e.admissionDate, e.exitDate) <= 90
  );
  const earlyTurnoverPercent = exitsInPeriod.length > 0 ? (earlyExits.length / exitsInPeriod.length) * 100 : null;

  // ---- 5. Custo médio por colaborador (base salarial — impostos e
  // benefícios ainda não são lançados como valor no sistema).
  const activeUsers = allUsers.filter((u) => u.active);
  const totalSalary = activeUsers.reduce((sum, u) => sum + Number(u.salary ?? 0), 0);
  const avgCostPerEmployee = activeUsers.length > 0 ? totalSalary / activeUsers.length : null;

  // ---- 6. Funil de recrutamento: candidatos inscritos no mês, por estágio
  // mais avançado já alcançado.
  const funnel = {
    total: candidatesInPeriod.length,
    interview: candidatesInPeriod.filter((c) => c.stage !== "TRIAGE").length,
    proposal: candidatesInPeriod.filter((c) => c.stage === "PROPOSAL" || c.stage === "HIRED").length,
    hired: candidatesInPeriod.filter((c) => c.stage === "HIRED").length,
  };

  return {
    competence,
    timeToHire: { avgDays: timeToHireAvgDays, sampleSize: timeToHireSamples.length },
    budgetDeviation: { percent: budgetDeviationPercent, allocated: totalAllocated, consumed: totalConsumed },
    turnover: { rate: turnoverRate, exits: exitsInPeriod.length, admissions: admissionsInPeriod, activeAtStart },
    earlyTurnover: { percent: earlyTurnoverPercent, earlyExits: earlyExits.length, totalExits: exitsInPeriod.length },
    avgCostPerEmployee: { value: avgCostPerEmployee, headcount: activeUsers.length },
    funnel,
  };
}

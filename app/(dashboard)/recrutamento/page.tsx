import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/ui/StatCard";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Briefcase, UserSquare2, UserCheck, Clock } from "lucide-react";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { CANDIDATE_STAGES, STAGE_LABELS } from "@/schemas/candidate";

function daysBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / 86_400_000;
}

function monthRange(date: Date) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
  return { start, end };
}

// Visão geral do módulo — aberta ao clicar no nome "Recrutamento" no menu,
// mesmo sem entrar em Vagas/Candidatos (ver Sidebar.tsx: group.href navega
// pra cá). Sem requireRole aqui não haveria risco de loop igual o antigo
// /dashboard geral tinha: quem não é ADMIN/HR cai no /dashboard (Início),
// que não tem nenhuma checagem de role.
async function getRecruitmentOverview(companyId: string) {
  const { start, end } = monthRange(new Date());

  const [openJobsCount, candidatesInProgressCount, hiresThisMonth, hiredCandidates, candidatesByStage, openJobs, stageByJob] =
    await Promise.all([
      prisma.job.count({ where: { companyId, status: "OPEN" } }),
      prisma.candidate.count({ where: { companyId, stage: { not: "HIRED" } } }),
      prisma.candidate.count({ where: { companyId, hiredAt: { gte: start, lt: end } } }),
      prisma.candidate.findMany({
        where: { companyId, hiredAt: { not: null } },
        select: { hiredAt: true, job: { select: { publishedAt: true } } },
      }),
      prisma.candidate.groupBy({ by: ["stage"], where: { companyId }, _count: { _all: true } }),
      prisma.job.findMany({
        where: { companyId, status: "OPEN" },
        select: { id: true, title: true, department: true, _count: { select: { candidates: true } } },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      // Concentração por etapa: HIRED é estado terminal, não interessa aqui.
      prisma.candidate.groupBy({
        by: ["jobId", "stage"],
        where: { companyId, stage: { not: "HIRED" } },
        _count: { _all: true },
      }),
    ]);

  // Tempo médio até contratação (todo o histórico, não só o mês — amostra
  // mensal costuma ser pequena demais pra fazer sentido). Mesma fórmula de
  // services/kpis.ts (job.publishedAt → candidate.hiredAt).
  const timeToHireSamples = hiredCandidates
    .filter((c) => c.job.publishedAt && c.hiredAt)
    .map((c) => daysBetween(c.job.publishedAt as Date, c.hiredAt as Date));
  const avgTimeToHireDays = timeToHireSamples.length
    ? Math.round(timeToHireSamples.reduce((a, b) => a + b, 0) / timeToHireSamples.length)
    : null;

  const stageCounts = new Map(candidatesByStage.map((s) => [s.stage, s._count._all]));
  const funnel = CANDIDATE_STAGES.map((stage) => ({
    stage,
    label: STAGE_LABELS[stage],
    count: stageCounts.get(stage) ?? 0,
  }));

  // Maior concentração de candidatos numa mesma etapa, por vaga — só vagas
  // com pelo menos 2 candidatos parados juntos entram na lista.
  const concentrationByJob = new Map<string, { stage: string; count: number }>();
  for (const row of stageByJob) {
    const current = concentrationByJob.get(row.jobId);
    if (!current || row._count._all > current.count) {
      concentrationByJob.set(row.jobId, { stage: row.stage, count: row._count._all });
    }
  }
  const concentratedJobIds = [...concentrationByJob.entries()]
    .filter(([, v]) => v.count >= 2)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([jobId]) => jobId);
  const concentratedJobsMeta = concentratedJobIds.length
    ? await prisma.job.findMany({ where: { id: { in: concentratedJobIds } }, select: { id: true, title: true } })
    : [];
  const jobTitleById = new Map(concentratedJobsMeta.map((j) => [j.id, j.title]));
  const stageConcentration = concentratedJobIds.map((jobId) => {
    const entry = concentrationByJob.get(jobId)!;
    return {
      jobId,
      title: jobTitleById.get(jobId) ?? "Vaga",
      stage: STAGE_LABELS[entry.stage as (typeof CANDIDATE_STAGES)[number]],
      count: entry.count,
    };
  });

  return { openJobsCount, candidatesInProgressCount, hiresThisMonth, avgTimeToHireDays, funnel, openJobs, stageConcentration };
}

export default async function RecrutamentoOverviewPage() {
  const session = await requireRole(["ADMIN", "HR"]);
  const data = await getRecruitmentOverview(session.companyId);

  return (
    <>
      <Header eyebrow="RECRUTAMENTO" title="Recrutamento" subtitle="Visão geral do módulo" />
      <div className="fin-content">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/recrutamento/vagas" className="flex">
            <StatCard icon={Briefcase} value={String(data.openJobsCount)} label="Vagas abertas" lift />
          </Link>
          <Link href="/recrutamento/candidatos" className="flex">
            <StatCard icon={UserSquare2} value={String(data.candidatesInProgressCount)} label="Candidatos em processo" lift />
          </Link>
          <StatCard icon={UserCheck} value={String(data.hiresThisMonth)} label="Contratações no mês" lift />
          <StatCard
            icon={Clock}
            value={data.avgTimeToHireDays !== null ? `${data.avgTimeToHireDays} dias` : "—"}
            label="Tempo médio até contratação"
            lift
          />
        </div>

        <div className="fin-card-hover-lift rounded-lg border border-[var(--border)] bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Link
                href="/recrutamento/candidatos"
                className="text-[11px] font-semibold uppercase tracking-wide text-ink hover:opacity-70"
                style={{ display: "inline-block" }}
              >
                Funil de candidatos
              </Link>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
                Visão por etapas do processo seletivo
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-4">
            {data.funnel.every((s) => s.count === 0) ? (
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Nenhum candidato cadastrado ainda.</p>
            ) : (
              (() => {
                const funnelTotal = data.funnel[0]?.count || 1;
                const funnelMax = Math.max(...data.funnel.map((s) => s.count), 1);
                return data.funnel.map((s) => {
                  const percent = Math.round((s.count / funnelTotal) * 100);
                  return (
                    <div key={s.stage}>
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="flex items-baseline gap-2">
                          <span className="text-ink">{s.label}</span>
                          <span className="text-gray-400">{s.count}</span>
                        </span>
                        <strong style={{ color: "var(--green-700)" }}>{percent}%</strong>
                      </div>
                      <ProgressBar percent={(s.count / funnelMax) * 100} color="var(--ink)" />
                    </div>
                  );
                });
              })()
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-[var(--border)] bg-white p-5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink">Concentração por etapa</span>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
              Vagas com mais candidatos numa mesma etapa
            </p>
            <div className="mt-4 flex flex-col divide-y divide-[var(--border)]">
              {data.stageConcentration.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
                  Nenhuma concentração relevante no momento.
                </p>
              ) : (
                data.stageConcentration.map((s) => (
                  <Link
                    key={s.jobId}
                    href={`/recrutamento/vagas/${s.jobId}?tab=candidatos`}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 hover:opacity-70"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-ink">{s.title}</div>
                      <div className="truncate text-xs text-gray-400">{s.stage}</div>
                    </div>
                    <span className="shrink-0 text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                      {s.count} candidatos
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className="fin-card-hover-lift rounded-lg border border-[var(--border)] bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Link
                  href="/recrutamento/vagas"
                  className="text-[11px] font-semibold uppercase tracking-wide text-ink hover:opacity-70"
                  style={{ display: "inline-block" }}
                >
                  Vagas abertas
                </Link>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-muted)" }}>Recebendo candidaturas agora</p>
              </div>
              <span style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                {data.openJobsCount} vagas ativas
              </span>
            </div>

            <div className="mt-4 flex flex-col divide-y divide-[var(--border)]">
              {data.openJobs.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Nenhuma vaga aberta no momento.</p>
              ) : (
                data.openJobs.map((j) => (
                  <Link
                    key={j.id}
                    href={`/recrutamento/vagas/${j.id}`}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 hover:opacity-70"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-ink">{j.title}</div>
                      <div className="truncate text-xs text-gray-400">{j.department || "—"}</div>
                    </div>
                    <span className="shrink-0 text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                      {j._count.candidates} candidato{j._count.candidates === 1 ? "" : "s"}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

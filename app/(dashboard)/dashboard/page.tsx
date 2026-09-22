import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/ui/StatCard";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";
import { Users, Briefcase, UserSquare2, GraduationCap } from "lucide-react";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { CANDIDATE_STAGES, STAGE_LABELS } from "@/schemas/candidate";

const STATUS_COLOR: Record<string, string> = {
  Ativo: "var(--green-700)",
  "Em avaliação": "var(--green-700)",
};

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function formatHeaderDate(date: Date): string {
  const dayMonth = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long" }).format(date);
  return `${dayMonth}, ${date.getFullYear()}`;
}

function Avatar({ name }: { name: string }) {
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
      style={{ background: "var(--ink)" }}
    >
      {initials(name)}
    </span>
  );
}

// Consulta direta (não via services/colaboradores.ts, services/jobs.ts e
// services/kanbanLabels.ts, que chamam requireRole internamente — se um
// EMPLOYEE caísse aqui, o redirect de requireRole aponta pro próprio
// /dashboard e entraria em loop). O filtro por companyId da sessão já
// garante o isolamento de tenant do mesmo jeito.
async function getDashboardData(companyId: string) {
  const [
    activeColaboradoresCount,
    people,
    openJobsCount,
    candidatesInProgressCount,
    openJobs,
    candidatesByStage,
  ] = await Promise.all([
    prisma.user.count({ where: { companyId, active: true } }),
    prisma.user.findMany({
      where: { companyId, active: true },
      select: { name: true, position: true, department: true },
      orderBy: { name: "asc" },
      take: 5,
    }),
    prisma.job.count({ where: { companyId, status: "OPEN" } }),
    prisma.candidate.count({ where: { companyId, stage: { not: "HIRED" } } }),
    prisma.job.findMany({
      where: { companyId, status: "OPEN" },
      select: { id: true, title: true, department: true, location: true, _count: { select: { candidates: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.candidate.groupBy({ by: ["stage"], where: { companyId }, _count: { _all: true } }),
  ]);

  const stageCounts = new Map(candidatesByStage.map((s) => [s.stage, s._count._all]));
  const recruitmentFunnel = CANDIDATE_STAGES.map((stage) => ({
    stage,
    label: STAGE_LABELS[stage],
    count: stageCounts.get(stage) ?? 0,
  }));

  return { activeColaboradoresCount, people, openJobsCount, candidatesInProgressCount, openJobs, recruitmentFunnel };
}

export default async function DashboardPage() {
  const session = await requireSession();
  const canSeeRealData = session.role === "ADMIN" || session.role === "HR";
  const data = canSeeRealData ? await getDashboardData(session.companyId) : null;

  return (
    <>
      <Header
        title="Dashboard"
        subtitle="Visão geral das pessoas e operações"
        date={formatHeaderDate(new Date())}
        searchPlaceholder="Buscar colaboradores, vagas ou documentos"
      />
      <div className="fin-content">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <Link href="/colaboradores" className="flex lg:col-span-2">
            <StatCard
              icon={Users}
              value={data ? String(data.activeColaboradoresCount) : "—"}
              label="Colaboradores"
              meta="Ativos"
              selected
              featured
            />
          </Link>
          <Link href="/recrutamento/vagas" className="flex">
            <StatCard icon={Briefcase} value={data ? String(data.openJobsCount) : "—"} label="Vagas abertas" lift />
          </Link>
          <Link href="/recrutamento/candidatos" className="flex">
            <StatCard
              icon={UserSquare2}
              value={data ? String(data.candidatesInProgressCount) : "—"}
              label="Candidatos"
              lift
            />
          </Link>
          <div className="relative">
            <div className="pointer-events-none select-none blur-sm">
              <StatCard icon={GraduationCap} value="—" label="Treinamentos" lift />
            </div>
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/60 p-2 text-center">
              <span
                className="rounded-full border border-[var(--border)] bg-white px-3 py-1 text-[11px] font-medium text-ink shadow-sm"
                style={{ boxShadow: "var(--shadow-sm)" }}
              >
                Módulo em desenvolvimento
              </span>
            </div>
          </div>
        </div>

        <div className="fin-card-hover-lift rounded-lg border border-[var(--border)] bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Link
                href="/recrutamento/candidatos"
                className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 hover:underline"
                style={{ display: "inline-block" }}
              >
                Funil de candidatos
              </Link>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
                Visão por etapas do processo seletivo
              </p>
            </div>
            <span style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
              Última atualização: hoje
            </span>
          </div>

          <div className="mt-5 flex flex-col gap-4">
            {!data || data.recruitmentFunnel.every((s) => s.count === 0) ? (
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
                Nenhum candidato cadastrado ainda.
              </p>
            ) : (
              (() => {
                const funnelTotal = data.recruitmentFunnel[0]?.count || 1;
                const funnelMax = Math.max(...data.recruitmentFunnel.map((s) => s.count), 1);
                return data.recruitmentFunnel.map((s) => {
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
          <div className="fin-card-hover-lift rounded-lg border border-[var(--border)] bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Link
                  href="/colaboradores"
                  className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 hover:underline"
                  style={{ display: "inline-block" }}
                >
                  Pessoas
                </Link>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-muted)" }}>Lista e gerenciamento</p>
              </div>
              <Link href="/colaboradores/novo">
                <Button variant="secondary">Adicionar</Button>
              </Link>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              {!data || data.people.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
                  Nenhum colaborador ativo cadastrado ainda.
                </p>
              ) : (
                data.people.map((p) => (
                  <div key={p.name} className="flex items-center gap-3">
                    <Avatar name={p.name} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-ink">{p.name}</div>
                      <div className="truncate text-xs text-gray-400">
                        {p.position || "Cargo não informado"}
                        {p.department ? ` — ${p.department}` : ""}
                      </div>
                    </div>
                    <span className="shrink-0 text-xs font-medium" style={{ color: STATUS_COLOR.Ativo }}>
                      Ativo
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="fin-card-hover-lift rounded-lg border border-[var(--border)] bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Link
                  href="/recrutamento/vagas"
                  className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 hover:underline"
                  style={{ display: "inline-block" }}
                >
                  Recrutamento
                </Link>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-muted)" }}>Vagas abertas</p>
              </div>
              <span style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                {data ? data.openJobsCount : 0} vagas ativas
              </span>
            </div>

            <div className="mt-4 flex flex-col divide-y divide-[var(--border)]">
              {!data || data.openJobs.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Nenhuma vaga aberta no momento.</p>
              ) : (
                data.openJobs.map((j) => (
                  <div key={j.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-ink">{j.title}</div>
                      <div className="truncate text-xs text-gray-400">
                        {j.department || j.location || "—"}
                      </div>
                    </div>
                    <span className="shrink-0 text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                      {j._count.candidates} candidato{j._count.candidates === 1 ? "" : "s"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

import "server-only";
import { prisma } from "@/lib/prisma";

// "Precisa da sua atenção" (tela Início) — pendências calculadas com DADOS
// REAIS da empresa, uma por vaga e tipo. Mais antigas primeiro, máx. 6.

export type AttentionType = "NEW_APPLICATIONS" | "STALLED" | "NO_APPLICATIONS";

export type AttentionItem = {
  type: AttentionType;
  jobId: string;
  jobTitle: string;
  // NEW/STALLED: nº de candidaturas; NO_APPLICATIONS: dias sem candidatura.
  count: number;
  // Data de referência (a mais antiga) — ordena a lista e vai no rodapé.
  since: string;
  // NO_APPLICATIONS: false = nunca recebeu candidatura (rodapé "Aberta em").
  hadApplications: boolean;
};

const NEW_WINDOW_DAYS = 7;
const STALLED_DAYS = 7;
const NO_APPLICATIONS_DAYS = 15;
const MAX_ITEMS = 6;

export async function getAttentionItems(companyId: string): Promise<AttentionItem[]> {
  const [fresh, stalled, empty] = await Promise.all([
    // Candidaturas novas nos últimos 7 dias, por vaga.
    prisma.$queryRaw<{ jobId: string; jobTitle: string; n: number; since: Date }[]>`
      select j.id::text as "jobId", j.title as "jobTitle", count(*)::int as n, min(a.created_at) as since
      from public.applications a
      join public.jobs j on j.id = a.job_id
      where a.company_id = ${companyId}::uuid
        and a.created_at >= now() - (${NEW_WINDOW_DAYS}::int * interval '1 day')
      group by j.id, j.title
    `,
    // Candidatos em andamento (vaga aberta) parados na mesma etapa há mais de
    // 7 dias: desde a última mudança de etapa ou, se nunca mudou, desde a
    // candidatura.
    prisma.$queryRaw<{ jobId: string; jobTitle: string; n: number; since: Date }[]>`
      with last_change as (
        select application_id, max(created_at) as at
        from public.application_events
        where company_id = ${companyId}::uuid and type = 'STAGE_CHANGED'
        group by application_id
      )
      select j.id::text as "jobId", j.title as "jobTitle", count(*)::int as n,
             min(coalesce(lc.at, a.created_at)) as since
      from public.applications a
      join public.jobs j on j.id = a.job_id
      left join last_change lc on lc.application_id = a.id
      where a.company_id = ${companyId}::uuid
        and j.status = 'OPEN'
        and a.stage not in ('HIRED', 'REJECTED')
        and coalesce(lc.at, a.created_at) < now() - (${STALLED_DAYS}::int * interval '1 day')
      group by j.id, j.title
    `,
    // Vagas abertas há mais de 15 dias sem nenhuma candidatura nesse período.
    prisma.$queryRaw<{ jobId: string; jobTitle: string; since: Date; hadApplications: boolean }[]>`
      select j.id::text as "jobId", j.title as "jobTitle",
             coalesce(max(a.created_at), coalesce(j.published_at, j.created_at)) as since,
             (max(a.created_at) is not null) as "hadApplications"
      from public.jobs j
      left join public.applications a on a.job_id = j.id
      where j.company_id = ${companyId}::uuid
        and j.status = 'OPEN'
        and coalesce(j.published_at, j.created_at) < now() - (${NO_APPLICATIONS_DAYS}::int * interval '1 day')
      group by j.id, j.title, j.published_at, j.created_at
      having max(a.created_at) is null
          or max(a.created_at) < now() - (${NO_APPLICATIONS_DAYS}::int * interval '1 day')
    `,
  ]);

  const now = Date.now();
  const items: AttentionItem[] = [
    ...fresh.map((r) => ({ type: "NEW_APPLICATIONS" as const, jobId: r.jobId, jobTitle: r.jobTitle, count: r.n, since: r.since.toISOString(), hadApplications: true })),
    ...stalled.map((r) => ({ type: "STALLED" as const, jobId: r.jobId, jobTitle: r.jobTitle, count: r.n, since: r.since.toISOString(), hadApplications: true })),
    ...empty.map((r) => ({
      type: "NO_APPLICATIONS" as const,
      jobId: r.jobId,
      jobTitle: r.jobTitle,
      count: Math.floor((now - r.since.getTime()) / 86_400_000),
      since: r.since.toISOString(),
      hadApplications: r.hadApplications,
    })),
  ];

  return items.sort((a, b) => a.since.localeCompare(b.since)).slice(0, MAX_ITEMS);
}

import "server-only";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { getAiConfig } from "@/lib/ai";
import { AI_BLOCK_REASON_LABELS, getAiBlockReason } from "@/lib/ai/availability";
import { hasActiveAiConsent } from "@/lib/screening/request";

// Leituras da triagem com IA pra interface. Sempre a partir da versão ATUAL
// do currículo da pessoa (Candidate.currentResumeId) e da geração mais
// recente. Nada aqui é sobre o candidato servir ou não pra vaga.

// Tags + experiência pros cards (kanban/lista) — só de análise CONCLUÍDA.
export type AiSnippet = { skills: string[]; experienceYears: number | null };

export async function getAiSnippets(companyId: string, candidateIds: string[]): Promise<Map<string, AiSnippet>> {
  if (candidateIds.length === 0) return new Map();
  const rows = await prisma.$queryRaw<{ candidateId: string; skills: string[]; experienceYears: number | null }[]>`
    select distinct on (c.id)
      c.id::text as "candidateId",
      ra.skills,
      (ra.result->>'experienciaAnos')::float8 as "experienceYears"
    from public.candidates c
    join public.resume_analyses ra on ra.resume_id = c.current_resume_id and ra.status = 'DONE'
    where c.company_id = ${companyId}::uuid and c.id = any(${candidateIds}::uuid[])
    order by c.id, ra.generation desc
  `;
  return new Map(rows.map((r) => [r.candidateId, { skills: r.skills, experienceYears: r.experienceYears }]));
}

// Pessoas cuja análise concluída mais recente tem a competência (sem
// diferenciar maiúsculas) — filtro do Banco de talentos.
export async function getCandidateIdsWithSkill(companyId: string, skill: string): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    with latest as (
      select distinct on (c.id) c.id, ra.skills
      from public.candidates c
      join public.resume_analyses ra on ra.resume_id = c.current_resume_id and ra.status = 'DONE'
      where c.company_id = ${companyId}::uuid
      order by c.id, ra.generation desc
    )
    select id::text as id from latest
    where exists (select 1 from unnest(skills) s where lower(s) = lower(${skill}))
  `;
  return rows.map((r) => r.id);
}

// Opções do filtro "competência": todas as tags em uso na empresa.
export async function listSkillOptions(): Promise<string[]> {
  const session = await requireRole(["ADMIN", "HR"]);
  const rows = await prisma.$queryRaw<{ skill: string }[]>`
    with latest as (
      select distinct on (c.id) ra.skills
      from public.candidates c
      join public.resume_analyses ra on ra.resume_id = c.current_resume_id and ra.status = 'DONE'
      where c.company_id = ${session.companyId}::uuid
      order by c.id, ra.generation desc
    )
    select distinct on (lower(s)) s as skill
    from latest, unnest(skills) s
    order by lower(s)
  `;
  return rows.map((r) => r.skill);
}

// Uso mensal da triagem com IA — contagem ÚNICA (card "Seu plano" da Início
// e, na etapa 4, Configurações). Conta análises CONCLUÍDAS com IA real no mês
// corrente no fuso de São Paulo; resultado do modo mock ("Exemplo simulado ·
// sem IA") NÃO conta — não é IA e não consome o limite do plano.
export async function getMonthlyAiUsage(companyId: string): Promise<number> {
  const rows = await prisma.$queryRaw<{ n: number }[]>`
    select count(*)::int as n
    from public.resume_analyses
    where company_id = ${companyId}::uuid
      and status = 'DONE'
      and is_mock = false
      and completed_at >= (date_trunc('month', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo')
  `;
  return rows[0]?.n ?? 0;
}

export async function getAiSnippetsForSession(candidateIds: string[]): Promise<Map<string, AiSnippet>> {
  const session = await requireRole(["ADMIN", "HR"]);
  return getAiSnippets(session.companyId, candidateIds);
}

// Estado do card "Resumo do currículo" no perfil — objeto serializável
// (vai pra Client Component).
export type ProfileAiAnalysis = {
  id: string;
  status: "PROCESSING" | "DONE" | "FAILED" | "NO_TEXT" | "SKIPPED";
  generation: number;
  errorCode: string | null;
  result: {
    resumo: string;
    experienciaAnos: number | null;
    experienciaBase: string | null;
    ultimosCargos: { cargo: string; empresa: string | null }[];
    formacao: string | null;
  } | null;
  skills: string[];
  skillsEdited: boolean;
  isMock: boolean;
  completedAt: string | null;
};

export type ProfileAiState = {
  hasResume: boolean;
  analysis: ProfileAiAnalysis | null;
  // Motivo de a ferramenta não rodar AGORA (texto aprovado, sobre a
  // ferramenta). null = pode gerar.
  blockedLabel: string | null;
};

export async function getProfileAiState(candidateId: string): Promise<ProfileAiState> {
  const session = await requireRole(["ADMIN", "HR"]);
  const candidate = await prisma.candidate.findFirst({
    where: { id: candidateId, companyId: session.companyId },
    select: {
      id: true,
      isTest: true,
      currentResumeId: true,
      company: { select: { aiScreeningEnabled: true } },
    },
  });
  if (!candidate?.currentResumeId) return { hasResume: false, analysis: null, blockedLabel: null };

  const [latest, hasConsent] = await Promise.all([
    prisma.resumeAnalysis.findFirst({
      where: { resumeId: candidate.currentResumeId, companyId: session.companyId },
      orderBy: { generation: "desc" },
    }),
    hasActiveAiConsent(prisma, session.companyId, candidate.id),
  ]);

  const reason = getAiBlockReason({
    isTest: candidate.isTest,
    allowRealData: getAiConfig().allowRealData,
    companyEnabled: candidate.company.aiScreeningEnabled,
    hasAiConsent: hasConsent,
  });

  return {
    hasResume: true,
    blockedLabel: reason ? AI_BLOCK_REASON_LABELS[reason] : null,
    analysis: latest
      ? {
          id: latest.id,
          status: latest.status as ProfileAiAnalysis["status"],
          generation: latest.generation,
          errorCode: latest.errorCode,
          result: (latest.result as ProfileAiAnalysis["result"]) ?? null,
          skills: latest.skills,
          skillsEdited: latest.skillsEditedAt !== null,
          isMock: latest.isMock,
          completedAt: latest.completedAt?.toISOString() ?? null,
        }
      : null,
  };
}

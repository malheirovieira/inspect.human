-- Fase 3 — Pesquisa de desligamento nativa. 1:1 com employee_exits (unique
-- em employee_exit_id) — reaproveita o MESMO mecanismo de token/expiração
-- de disc_responses/quiz_responses (migration 0036): token único, 7 dias
-- de validade, submitted_at marca resposta única.
create table if not exists public.exit_survey_responses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_exit_id uuid not null unique references public.employee_exits(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  submitted_at timestamptz,

  -- Respostas (tudo nulo até submitted_at ser preenchido).
  leader_name text,
  environment_score smallint,
  leader_relationship_score smallint,
  growth_score smallint,
  benefits_score smallint,
  communication_score smallint,
  biggest_challenge text,
  improvement_suggestion text,
  would_return boolean,
  would_recommend boolean,
  free_comment text,

  -- Consentimento pra análise por IA do comentário livre (Fase 2) — só
  -- preenchido se o respondente consentir; análise (Fase 5) exige isto.
  consent_id uuid references public.consents(id) on delete set null,

  -- Preparação pra integração futura com ERP — não implementado agora.
  data_source text not null default 'manual',
  external_ref text,

  created_at timestamptz not null default now()
);

alter table public.exit_survey_responses
  add constraint exit_survey_scores_range check (
    (environment_score is null or environment_score between 1 and 5) and
    (leader_relationship_score is null or leader_relationship_score between 1 and 5) and
    (growth_score is null or growth_score between 1 and 5) and
    (benefits_score is null or benefits_score between 1 and 5) and
    (communication_score is null or communication_score between 1 and 5)
  );

create index if not exists idx_exit_survey_responses_company on public.exit_survey_responses (company_id);
create index if not exists idx_exit_survey_responses_token on public.exit_survey_responses (token);

-- Mesmo padrão deny-all das demais tabelas (acesso só via Prisma/service role).
alter table public.exit_survey_responses enable row level security;
revoke all on public.exit_survey_responses from anon, authenticated;

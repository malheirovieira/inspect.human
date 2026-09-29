-- Avaliação comportamental DISC (2 partes, 60 afirmações, escala Likert
-- 1-5) — substitui o uso do sistema genérico de assessments (que fica no
-- banco sem uso, não removido) como o teste padrão vinculado à candidatura.

create table if not exists public.disc_assessments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null default 'Avaliação Comportamental',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_disc_assessments_company on public.disc_assessments(company_id);

-- 60 afirmações fixas por assessment (sem CRUD — populadas via seed).
create table if not exists public.disc_questions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.disc_assessments(id) on delete cascade,
  position integer not null,
  section text not null check (section in ('COMPETENCIAS', 'DISC')),
  dimension text not null,
  text text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_disc_questions_assessment on public.disc_questions(assessment_id, position);

-- Uma tentativa (candidato x assessment), acessada via token público —
-- mesmo modelo de link único + expiração do assessment_responses genérico.
create table if not exists public.disc_responses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  application_id uuid not null unique references public.applications(id) on delete cascade,
  assessment_id uuid not null references public.disc_assessments(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  submitted_at timestamptz,

  -- Scores Competências (0-100, 1 casa decimal)
  score_energia numeric(5,2),
  score_responsabilidade numeric(5,2),
  score_engajamento numeric(5,2),
  score_trabalho_equipe numeric(5,2),
  score_comprometimento numeric(5,2),
  score_aprendizagem numeric(5,2),
  score_geral numeric(5,2),
  nivel_geral text,

  -- Scores DISC (0-100)
  score_d numeric(5,2),
  score_i numeric(5,2),
  score_s numeric(5,2),
  score_c numeric(5,2),
  perfil_disc text,

  created_at timestamptz not null default now()
);
create index if not exists idx_disc_responses_token on public.disc_responses(token);
create index if not exists idx_disc_responses_application on public.disc_responses(application_id);
create index if not exists idx_disc_responses_company on public.disc_responses(company_id);

-- Nota (1-5) do candidato em cada uma das 60 afirmações.
create table if not exists public.disc_answers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  response_id uuid not null references public.disc_responses(id) on delete cascade,
  question_id uuid not null references public.disc_questions(id) on delete cascade,
  score integer not null check (score between 1 and 5),
  created_at timestamptz not null default now(),
  unique(response_id, question_id)
);
create index if not exists idx_disc_answers_response on public.disc_answers(response_id);
create index if not exists idx_disc_answers_company on public.disc_answers(company_id);

-- ============================================================================
-- RLS: nega tudo por padrão a anon/authenticated — mesmo modelo do resto do
-- projeto (ver 0025_assessments_phase2.sql). Toda leitura/escrita, inclusive
-- da rota pública do candidato SEM login, passa pelo Prisma no servidor
-- (conexão direta, ignora RLS) com checagem manual de company_id — nunca
-- via Supabase client do navegador. GRANT direto a anon/authenticated
-- abriria acesso cross-tenant sem essa checagem, por isso não é usado aqui.
-- ============================================================================
alter table public.disc_assessments enable row level security;
alter table public.disc_questions enable row level security;
alter table public.disc_responses enable row level security;
alter table public.disc_answers enable row level security;

revoke all on public.disc_assessments, public.disc_questions, public.disc_responses, public.disc_answers from anon, authenticated;

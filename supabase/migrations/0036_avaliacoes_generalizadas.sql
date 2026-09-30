-- ============================================================================
-- 1. Corrige DiscResponse: hoje `application_id` é @unique SOZINHO, o que
--    impede um candidato receber mais de UMA avaliação (mesmo que sejam
--    avaliações diferentes). Vira unique composto (candidatura, avaliação).
-- ============================================================================
alter table public.disc_responses drop constraint if exists disc_responses_application_id_key;
alter table public.disc_responses add constraint disc_responses_application_id_assessment_id_key unique (application_id, assessment_id);

-- ============================================================================
-- 2. Novo tipo de avaliação: "Quiz" — múltipla escolha com gabarito e
--    pontuação (N acertos / N perguntas), decisão de produto para avaliações
--    não-DISC. Mesmo padrão de RLS do resto do projeto (nega tudo; toda
--    leitura/escrita passa por Prisma no servidor com companyId checado).
-- ============================================================================
create table if not exists public.quiz_assessments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  -- true = "Pontuação" (múltipla escolha com gabarito, resultado N/M pts);
  -- false = "Sem pontuação" (só coleta a escolha, sem certo/errado/nota).
  scored boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_quiz_assessments_company on public.quiz_assessments(company_id);

create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  assessment_id uuid not null references public.quiz_assessments(id) on delete cascade,
  position integer not null,
  text text not null,
  max_score integer not null default 1,
  created_at timestamptz not null default now()
);
create index if not exists idx_quiz_questions_assessment on public.quiz_questions(assessment_id, position);

create table if not exists public.quiz_choices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  position integer not null,
  text text not null,
  is_correct boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_quiz_choices_question on public.quiz_choices(question_id, position);

create table if not exists public.quiz_responses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  application_id uuid not null references public.applications(id) on delete cascade,
  assessment_id uuid not null references public.quiz_assessments(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  submitted_at timestamptz,
  score integer,
  max_score integer,
  created_at timestamptz not null default now(),
  unique (application_id, assessment_id)
);
create index if not exists idx_quiz_responses_token on public.quiz_responses(token);
create index if not exists idx_quiz_responses_application on public.quiz_responses(application_id);
create index if not exists idx_quiz_responses_company on public.quiz_responses(company_id);

create table if not exists public.quiz_answers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  response_id uuid not null references public.quiz_responses(id) on delete cascade,
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  choice_id uuid not null references public.quiz_choices(id) on delete cascade,
  score integer not null default 0,
  created_at timestamptz not null default now(),
  unique (response_id, question_id)
);
create index if not exists idx_quiz_answers_response on public.quiz_answers(response_id);

alter table public.quiz_assessments enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_choices enable row level security;
alter table public.quiz_responses enable row level security;
alter table public.quiz_answers enable row level security;

revoke all on public.quiz_assessments, public.quiz_questions, public.quiz_choices, public.quiz_responses, public.quiz_answers from anon, authenticated;

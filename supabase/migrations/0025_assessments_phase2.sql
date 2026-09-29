-- Fase 2: Testes e Avaliações (assessments)
-- Tabelas: assessments, assessment_questions, assessment_choices, assessment_responses, assessment_answers

-- ============================================================================
-- assessments — o teste em si (nome, descrição, pontuação total)
-- ============================================================================
create table assessments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  title text not null,
  description text,
  total_score integer not null default 0, -- soma das pontuações max das perguntas
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_assessments_company on assessments (company_id);

-- ============================================================================
-- assessment_questions — perguntas do teste
-- type validado no Zod, sem check constraint por ora (extensível para OPEN_TEXT, SCALE, etc.)
-- ============================================================================
create table assessment_questions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  assessment_id uuid not null references assessments (id) on delete cascade,
  text text not null,
  type text not null default 'MULTIPLE_CHOICE', -- validado no Zod
  max_score integer not null default 1, -- pontuação máxima desta pergunta
  position integer not null default 0, -- ordem dentro do teste
  created_at timestamptz not null default now()
);
create index idx_assessment_questions_assessment on assessment_questions (assessment_id, position);
create index idx_assessment_questions_company on assessment_questions (company_id);

-- ============================================================================
-- assessment_choices — opções de múltipla escolha
-- ============================================================================
create table assessment_choices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  question_id uuid not null references assessment_questions (id) on delete cascade,
  text text not null,
  is_correct boolean not null default false,
  position integer not null default 0, -- ordem das opções
  created_at timestamptz not null default now()
);
create index idx_assessment_choices_question on assessment_choices (question_id, position);
create index idx_assessment_choices_company on assessment_choices (company_id);

-- ============================================================================
-- assessment_responses — resposta de uma candidatura a um teste
-- token: UUID único, usado para gerar link público (ex: /avaliacao/[token])
-- submitted_at: null até o candidato finalizar — protege contra resposta parcial
-- expires_at: deadline (configurável, ex: agora + 72h)
-- score: gravado apenas no momento do submit
-- ============================================================================
create table assessment_responses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  application_id uuid not null references applications (id) on delete cascade,
  assessment_id uuid not null references assessments (id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  submitted_at timestamptz,
  score integer,
  created_at timestamptz not null default now()
);
create index idx_assessment_responses_application on assessment_responses (application_id);
create index idx_assessment_responses_token on assessment_responses (token);
create index idx_assessment_responses_company on assessment_responses (company_id);
create index idx_assessment_responses_submitted on assessment_responses (submitted_at) where submitted_at is not null;

-- Trigger: copiar company_id de application
create or replace function assessment_responses_set_company_id()
returns trigger language plpgsql as $$
begin
  select company_id into new.company_id from applications where id = new.application_id;
  if new.company_id is null then
    raise exception 'application_id inválido: candidatura não encontrada';
  end if;
  return new;
end;
$$;
create trigger trg_assessment_responses_set_company_id
  before insert on assessment_responses
  for each row execute function assessment_responses_set_company_id();

-- ============================================================================
-- assessment_answers — resposta por pergunta (choice escolhida + pontuação)
-- choice_id: nullable (para futuros tipos como OPEN_TEXT, SCALE)
-- score: 0 ou max_score (determinado pela escolha ou avaliação)
-- ============================================================================
create table assessment_answers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  response_id uuid not null references assessment_responses (id) on delete cascade,
  question_id uuid not null references assessment_questions (id) on delete cascade,
  choice_id uuid references assessment_choices (id) on delete set null,
  score integer not null default 0,
  created_at timestamptz not null default now()
);
create index idx_assessment_answers_response on assessment_answers (response_id);
create index idx_assessment_answers_company on assessment_answers (company_id);
create index idx_assessment_answers_question on assessment_answers (question_id) where score > 0;

-- Trigger: copiar company_id de response
create or replace function assessment_answers_set_company_id()
returns trigger language plpgsql as $$
begin
  select company_id into new.company_id from assessment_responses where id = new.response_id;
  if new.company_id is null then
    raise exception 'response_id inválido: resposta do candidato não encontrada';
  end if;
  return new;
end;
$$;
create trigger trg_assessment_answers_set_company_id
  before insert on assessment_answers
  for each row execute function assessment_answers_set_company_id();

-- ============================================================================
-- RLS: nega tudo por padrão a anon/authenticated
-- ============================================================================
alter table assessments enable row level security;
alter table assessment_questions enable row level security;
alter table assessment_choices enable row level security;
alter table assessment_responses enable row level security;
alter table assessment_answers enable row level security;

revoke all on assessments, assessment_questions, assessment_choices, assessment_responses, assessment_answers from anon, authenticated;

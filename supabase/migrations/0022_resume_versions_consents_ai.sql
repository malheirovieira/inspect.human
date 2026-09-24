-- ============================================================================
-- 0022_resume_versions_consents_ai.sql
-- Aditiva, sem risco. Base de dados da Fase 3 (triagem com IA):
--
-- 1. candidate_resumes — VERSÕES do currículo. Cada arquivo diferente vira
--    uma versão nova (caminho próprio no Storage: empresa/pessoa/<sha256>.pdf,
--    sem upsert); o mesmo arquivo enviado de novo reaproveita a versão
--    (unique candidate_id + sha256). Guarda também o texto extraído do PDF
--    (preenchido pelo processamento da Fase 3, serve pra busca depois).
-- 2. candidates.current_resume_id — versão ATUAL da pessoa (perfil).
--    applications.resume_id — versão ENVIADA naquela candidatura; registro
--    histórico, não muda quando a pessoa ganha versão nova.
-- 3. resume_analyses — uma linha por geração de resumo por IA (só acrescenta,
--    nunca sobrescreve — o histórico também alimenta o contador de uso).
-- 4. consents — consentimento genérico (finalidade + versão do texto), não
--    só pra IA.
-- 5. candidates.is_test (candidato fictício, editável só por ADMIN) e
--    companies.ai_screening_enabled (chave "Triagem com IA").
--
-- candidates.resume_path NÃO sai aqui: primeiro rodar
-- scripts/backfill-resume-versions.js (calcula o hash dos arquivos antigos,
-- coisa que SQL não faz) e conferir; a remoção fica pra migration 0023.
--
-- Aplicar com:
--   npx prisma db execute --file supabase/migrations/0022_resume_versions_consents_ai.sql
--   npx prisma generate
-- Depois atualizar supabase/schema.sql manualmente.
-- ============================================================================

-- ---- 1. versões do currículo ----------------------------------------------
create table public.candidate_resumes (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  candidate_id  uuid not null references public.candidates(id) on delete cascade,
  storage_path  text not null unique,
  sha256        text not null,
  size_bytes    integer not null,
  -- LEGACY = migrado do antigo candidates.resume_path pelo backfill
  source        text not null,
  uploaded_by   uuid references public.users(id) on delete set null,
  -- preenchidos pelo processamento (Fase 3)
  extracted_text text,
  text_status   text not null default 'PENDING',
  page_count    integer,
  extracted_at  timestamptz,
  -- quando deixou de ser a versão atual da pessoa — base da retenção
  superseded_at timestamptz,
  created_at    timestamptz not null default now(),
  constraint candidate_resumes_sha256_format check (sha256 ~ '^[0-9a-f]{64}$'),
  constraint candidate_resumes_source_check check (source in ('PUBLIC_FORM', 'RECRUITER', 'LEGACY')),
  constraint candidate_resumes_text_status_check check (text_status in ('PENDING', 'OK', 'NO_TEXT', 'INVALID_PDF')),
  constraint candidate_resumes_candidate_sha256_unique unique (candidate_id, sha256)
);
create index idx_candidate_resumes_company_candidate
  on public.candidate_resumes (company_id, candidate_id, created_at desc);
create index idx_candidate_resumes_superseded_at
  on public.candidate_resumes (superseded_at) where superseded_at is not null;

-- ---- 2. ponteiros de versão -----------------------------------------------
alter table public.candidates
  add column current_resume_id uuid references public.candidate_resumes(id) on delete set null,
  add column is_test boolean not null default false;

alter table public.applications
  add column resume_id uuid references public.candidate_resumes(id) on delete set null;
create index idx_applications_resume on public.applications (resume_id) where resume_id is not null;

-- ---- 3. análises por IA ---------------------------------------------------
create table public.resume_analyses (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies(id) on delete cascade,
  resume_id        uuid not null references public.candidate_resumes(id) on delete cascade,
  generation       integer not null,
  status           text not null default 'PROCESSING',
  -- por que a ferramenta não rodou (status SKIPPED) — é sobre a
  -- ferramenta, nunca sobre o candidato
  skip_reason      text,
  -- saída validada da IA (resumo, experiência, cargos, formação, tags originais)
  result           jsonb,
  -- tags em vigor: começam iguais às da IA, o recrutador pode editar
  skills           text[] not null default '{}',
  skills_edited_at timestamptz,
  skills_edited_by uuid references public.users(id) on delete set null,
  provider         text,
  model            text,
  is_mock          boolean not null default false,
  -- código curto, sem dado pessoal (detalhe técnico fica em background_tasks.last_error)
  error_code       text,
  created_at       timestamptz not null default now(),
  completed_at     timestamptz,
  constraint resume_analyses_generation_check check (generation >= 1),
  constraint resume_analyses_status_check check (status in ('PROCESSING', 'DONE', 'FAILED', 'NO_TEXT', 'SKIPPED')),
  constraint resume_analyses_skip_reason_check
    check (skip_reason is null or skip_reason in ('NO_CONSENT', 'COMPANY_DISABLED', 'REAL_DATA_BLOCKED')),
  constraint resume_analyses_resume_generation_unique unique (resume_id, generation)
);
create index idx_resume_analyses_skills on public.resume_analyses using gin (skills);
-- contador de uso mensal por empresa
create index idx_resume_analyses_company_completed
  on public.resume_analyses (company_id, completed_at) where status = 'DONE';

-- ---- 4. consentimentos ----------------------------------------------------
create table public.consents (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies(id) on delete cascade,
  candidate_id   uuid not null references public.candidates(id) on delete cascade,
  application_id uuid references public.applications(id) on delete cascade,
  -- APPLICATION_PROCESSING | AI_SCREENING | … — validado no Zod, sem check
  -- constraint (finalidade nova não precisa de migration)
  purpose        text not null,
  -- versão e hash do texto exato que a pessoa viu
  text_version   text not null,
  text_hash      text not null,
  source         text not null,
  granted_at     timestamptz not null default now(),
  revoked_at     timestamptz
);
create index idx_consents_company_candidate_purpose
  on public.consents (company_id, candidate_id, purpose);

-- ---- 5. chave da empresa --------------------------------------------------
alter table public.companies
  add column ai_screening_enabled boolean not null default false,
  add column ai_screening_changed_at timestamptz,
  add column ai_screening_changed_by uuid references public.users(id) on delete set null;

-- ---- rede de segurança (armadilha nº 9 do CONTEXT.md) ---------------------
alter table public.candidate_resumes enable row level security;
alter table public.resume_analyses enable row level security;
alter table public.consents enable row level security;
revoke all on public.candidate_resumes from anon, authenticated;
revoke all on public.resume_analyses from anon, authenticated;
revoke all on public.consents from anon, authenticated;

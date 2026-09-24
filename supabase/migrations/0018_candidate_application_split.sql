-- ============================================================================
-- 0018_candidate_application_split.sql
-- Separa Candidate (a pessoa) de Application (a candidatura a uma vaga
-- específica) — base pro "banco de talentos" (uma pessoa, várias vagas) e
-- pro ATS (Fase 0: tipos de etapa, eventos, fila).
--
-- candidates tem 0 linhas hoje (checado antes de escrever esta migration),
-- então não há dado real pra migrar — é só mover as colunas de
-- vaga/etapa/processo pra uma tabela nova.
--
-- Aplicar com:
--   npx prisma db execute --file supabase/migrations/0018_candidate_application_split.sql
--   npx prisma generate
-- Depois atualizar supabase/schema.sql manualmente.
-- Sem RLS (padrão do projeto) — isolamento por company_id fica nas
-- queries de services/actions.
-- ============================================================================

-- candidates perde tudo que é específico de UMA candidatura (agora mora em
-- applications) e vira só a pessoa. O trigger/constraint ligados a essas
-- colunas some junto do drop da coluna (comportamento padrão do Postgres).
drop trigger if exists trg_candidates_set_company_id on public.candidates;
drop function if exists candidates_set_company_id();

alter table public.candidates
  drop column job_id,
  drop column stage,
  drop column position,
  drop column qualification_tag,
  drop column hired_at,
  drop column process_steps;

drop index if exists idx_candidates_job;
drop index if exists idx_candidates_stage;
create index if not exists idx_candidates_company_email on public.candidates (company_id, email);

-- applications — a candidatura de um Candidate a um Job. Sem check
-- constraint pra stage (candidates tinha um fixo em 4 valores — padrão mais
-- recente do projeto é validar no Zod e deixar mais barato adicionar etapa
-- nova sem precisar de migration).
create table public.applications (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references public.companies(id) on delete cascade,
  candidate_id      uuid not null references public.candidates(id) on delete cascade,
  job_id            uuid not null references public.jobs(id) on delete cascade,
  stage             text not null default 'TRIAGE',
  position          integer not null default 0,
  qualification_tag text,
  hired_at          timestamptz,
  process_steps     jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_applications_company on public.applications (company_id);
create index idx_applications_job on public.applications (company_id, job_id);
create index idx_applications_stage on public.applications (company_id, job_id, stage);
create index idx_applications_candidate on public.applications (company_id, candidate_id);

-- Mesma proteção que candidates tinha: company_id sempre derivado do job_id
-- no servidor (o valor mandado pelo app é sobrescrito), nunca confiado do
-- payload do cliente.
create or replace function applications_set_company_id()
returns trigger language plpgsql as $$
begin
  select company_id into new.company_id from public.jobs where id = new.job_id;
  if new.company_id is null then
    raise exception 'job_id inválido: vaga não encontrada';
  end if;
  return new;
end;
$$;
create trigger trg_applications_set_company_id
  before insert on public.applications
  for each row execute function applications_set_company_id();

create trigger trg_applications_updated_at
  before update on public.applications
  for each row execute function set_updated_at();

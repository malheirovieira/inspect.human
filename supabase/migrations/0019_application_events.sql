-- ============================================================================
-- 0019_application_events.sql
-- Aditiva, sem risco. Histórico cronológico de uma candidatura (mudança de
-- etapa, nota, e-mail enviado na Fase 1 etc.) — base do componente
-- CandidateActivityTimeline. Não altera candidates/applications: TEST e
-- REJECTED (novas etapas) não precisam de migration porque `stage` não tem
-- check constraint desde a separação Candidate/Application (0018) — só
-- código (schemas/candidate.ts).
--
-- Aplicar com:
--   npx prisma db execute --file supabase/migrations/0019_application_events.sql
--   npx prisma generate
-- Depois atualizar supabase/schema.sql manualmente.
-- Sem RLS (padrão do projeto) — isolamento por company_id fica nas
-- queries de services/actions.
-- ============================================================================

create table public.application_events (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies(id) on delete cascade,
  application_id uuid not null references public.applications(id) on delete cascade,
  type           text not null,  -- validado no Zod, sem check constraint por ora
  payload        jsonb,
  actor_id       uuid references public.users(id) on delete set null,
  created_at     timestamptz not null default now()
);

create index idx_application_events_company_application
  on public.application_events (company_id, application_id);

create index idx_application_events_company_created_at
  on public.application_events (company_id, created_at);

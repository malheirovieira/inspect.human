-- ============================================================================
-- 0013_employee_documents.sql
-- Aditiva, sem risco. Aplicar com:
--   npx prisma db execute --file supabase/migrations/0013_employee_documents.sql
--   npx prisma generate
-- Depois atualizar supabase/schema.sql manualmente.
-- Sem RLS (padrão do projeto) — isolamento por company_id fica nas
-- queries de services/actions.
-- ============================================================================

create table public.employee_documents (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  user_id         uuid not null references public.users(id) on delete cascade,
  type            text not null,  -- validado no Zod, sem check constraint por ora
  file_name       text not null,
  file_url        text not null,
  issue_date      date,
  expiration_date date,
  notes           text,
  created_at      timestamptz not null default now()
);

create index idx_employee_documents_company_id_user_id
  on public.employee_documents (company_id, user_id);

create index idx_employee_documents_company_id_expiration_date
  on public.employee_documents (company_id, expiration_date);

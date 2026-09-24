-- ============================================================================
-- 0017_notifications.sql
-- Aditiva, sem risco. Aplicar com:
--   npx prisma db execute --file supabase/migrations/0017_notifications.sql
--   npx prisma generate
-- Depois atualizar supabase/schema.sql manualmente.
-- Sem RLS (padrão do projeto) — isolamento por company_id fica nas
-- queries de services/actions.
-- ============================================================================

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  type       text not null,  -- validado no Zod, sem check constraint por ora
  title      text not null,
  message    text not null,
  link       text,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_notifications_company_id_created_at
  on public.notifications (company_id, created_at desc);

create index idx_notifications_company_id_read
  on public.notifications (company_id, read);

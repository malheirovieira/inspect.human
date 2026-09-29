-- Banners de parceiros na tela de Início — globais (não por empresa),
-- geridos só pelo SUPERADMIN. Exibidos pra toda empresa autenticada.
create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image_url text not null,
  link_url text not null,
  position integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_partners_active_position on public.partners(active, position);

-- ============================================================================
-- RLS: nega tudo por padrão — mesmo modelo do resto do projeto (ver
-- 0025_assessments_phase2.sql, 0031_disc_assessment.sql). A leitura na tela
-- de Início e toda escrita administrativa passam pelo Prisma no servidor
-- (conexão direta, ignora RLS), com requireRole(["SUPERADMIN"]) nas actions
-- de escrita — nunca GRANT direto pro client do navegador.
-- ============================================================================
alter table public.partners enable row level security;
revoke all on public.partners from anon, authenticated;

-- Parametrização de IA por empresa (BYOK) — Fase 1. Chave sempre
-- criptografada na aplicação (AES-256-GCM) antes de chegar aqui; esta
-- coluna nunca guarda texto puro. Uma linha por empresa (company_id único):
-- a empresa escolhe UM provider ativo por vez.
--
-- data_source/external_ref: preparação pra integração futura com ERP (nota
-- de arquitetura do pedido) — não implementado agora, só a coluna.
create table if not exists public.company_ai_configs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references public.companies(id) on delete cascade,
  provider text not null check (provider in ('anthropic', 'openai', 'gemini')),
  api_key_encrypted text not null,
  model text not null,
  enabled boolean not null default true,
  data_source text not null default 'manual',
  external_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Mesmo padrão deny-all das demais tabelas (migration 0036 etc.): acesso só
-- via conexão direta do Prisma (service role), nunca por anon/authenticated.
alter table public.company_ai_configs enable row level security;
revoke all on public.company_ai_configs from anon, authenticated;

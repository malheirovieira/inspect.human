-- ============================================================================
-- 0021_background_tasks.sql
-- Aditiva, sem risco. Fila de tarefas em segundo plano (BackgroundTask) —
-- base das Fases 1 (e-mail) e 3 (triagem com IA) do Recrutamento. Nome
-- `background_tasks` de propósito: `jobs` já é a tabela de VAGAS.
--
-- Processador em lib/tasks/queue.ts: pega tarefas com
-- `FOR UPDATE SKIP LOCKED` num único comando (seguro no transaction pooler),
-- chamado pela rota /api/cron/tasks (disparada pelo pg_cron — ver
-- supabase/cron/process_tasks.sql, que NÃO é migration).
--
-- Aplicar com:
--   npx prisma db execute --file supabase/migrations/0021_background_tasks.sql
--   npx prisma generate
-- Depois atualizar supabase/schema.sql manualmente.
-- ============================================================================

create table public.background_tasks (
  id              uuid primary key default gen_random_uuid(),
  -- null = tarefa do sistema, sem empresa (não aparece na tela do ADMIN)
  company_id      uuid references public.companies(id) on delete cascade,
  type            text not null,  -- validado no registro de tipos (lib/tasks), sem check constraint
  payload         jsonb not null default '{}'::jsonb,
  status          text not null default 'pending',
  attempts        integer not null default 0,
  max_attempts    integer not null default 5,
  -- reagendamentos por erro temporário (ex.: HTTP 429) — não consomem
  -- attempts, mas têm limite próprio no processador
  deferrals       integer not null default 0,
  run_at          timestamptz not null default now(),
  locked_at       timestamptz,
  locked_by       text,
  last_error      text,
  -- unique aceita vários null (tarefa sem chave) — com chave, enfileirar de
  -- novo é ignorado (ON CONFLICT DO NOTHING)
  idempotency_key text unique,
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint background_tasks_status_check check (status in ('pending', 'running', 'done', 'failed')),
  constraint background_tasks_attempts_check check (attempts >= 0 and max_attempts >= 1 and deferrals >= 0)
);

-- próxima tarefa a pegar: só pending, ordenado por run_at
create index idx_background_tasks_pending_run_at
  on public.background_tasks (run_at) where status = 'pending';

-- recuperação de tarefa travada
create index idx_background_tasks_running_locked_at
  on public.background_tasks (locked_at) where status = 'running';

-- tela de Configurações (contagem por status / últimas falhas) e retenção
create index idx_background_tasks_company_status
  on public.background_tasks (company_id, status, updated_at desc);
create index idx_background_tasks_completed_at
  on public.background_tasks (status, completed_at) where status in ('done', 'failed');

create trigger trg_background_tasks_updated_at
  before update on public.background_tasks
  for each row execute function set_updated_at();

-- Tabela nova no Supabase recebe grants padrão pra anon/authenticated — o
-- `revoke all on all tables` do schema.sql só valeu pras tabelas que já
-- existiam quando ele rodou. Rede de segurança explícita aqui.
alter table public.background_tasks enable row level security;
revoke all on public.background_tasks from anon, authenticated;

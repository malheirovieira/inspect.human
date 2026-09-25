-- ============================================================================
-- process_tasks.sql — agendamento da fila de tarefas (background_tasks)
--
-- NÃO é migration: a URL e o segredo mudam por ambiente. Rodar UMA vez no
-- SQL Editor de cada projeto Supabase que tenha app publicado (produção),
-- depois da migration 0021. No projeto de TESTE não precisa (os testes
-- chamam o processador direto).
--
-- Por que pg_cron e não o cron da Vercel: no plano Hobby o cron da Vercel
-- roda no máximo 1x por dia. Aqui roda a cada minuto, mas SÓ chama a rota
-- quando existe trabalho (tarefa pending vencida ou running travada) — sem
-- trabalho, nenhuma requisição sai.
--
-- Antes de rodar, troque os dois valores marcados com <...>:
--   <URL_DO_APP>   ex.: https://inspect-talent.vercel.app
--   <CRON_SECRET>  o MESMO valor da variável CRON_SECRET na Vercel
-- Os dois ficam no Supabase Vault (criptografados), não neste arquivo nem
-- no repositório — não commitar este arquivo com os valores preenchidos.
-- ============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Segredos no Vault. Pra trocar depois:
--   select vault.update_secret(id, '<novo valor>') from vault.secrets where name = 'tasks_cron_secret';
select vault.create_secret('<URL_DO_APP>/api/cron/tasks', 'tasks_cron_url', 'Rota do processador de tarefas');
select vault.create_secret('<CRON_SECRET>', 'tasks_cron_secret', 'Bearer da rota /api/cron/tasks');

create or replace function public.dispatch_background_tasks()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  -- Sem trabalho, não chama a rota. "10 minutes" = STALE_AFTER_MS em
  -- lib/tasks/queue.ts — mudar nos dois lugares juntos.
  if not exists (
    select 1 from public.background_tasks
    where (status = 'pending' and run_at <= now())
       or (status = 'running' and locked_at < now() - interval '10 minutes')
  ) then
    return;
  end if;

  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'tasks_cron_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'tasks_cron_secret';
  if v_url is null or v_secret is null then
    raise warning 'dispatch_background_tasks: segredos tasks_cron_url/tasks_cron_secret ausentes no Vault';
    return;
  end if;

  perform net.http_post(
    url := v_url,
    body := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret
    ),
    -- Acima do maxDuration da rota (60s). O padrão do pg_net (5s) cortaria
    -- a execução do processador no meio.
    timeout_milliseconds := 65000
  );
end;
$$;

revoke all on function public.dispatch_background_tasks() from public, anon, authenticated;

-- A cada minuto. Execuções sobrepostas são seguras (FOR UPDATE SKIP LOCKED
-- no processador). Pra remover: select cron.unschedule('process-background-tasks');
select cron.schedule(
  'process-background-tasks',
  '* * * * *',
  $$select public.dispatch_background_tasks()$$
);

-- Retenção de versões substituídas de currículo (Fase 3): 1x por dia, às
-- 06:00 UTC (03:00 em Brasília), cria a tarefa resume.purge_versions — o
-- agendamento de cima vê a tarefa pendente e chama a rota. A chave de
-- idempotência por data impede duplicar no mesmo dia.
select cron.schedule(
  'enqueue-resume-purge',
  '0 6 * * *',
  $$insert into public.background_tasks (type, payload, idempotency_key)
    values ('resume.purge_versions', '{}'::jsonb, 'resume.purge_versions:' || current_date)
    on conflict (idempotency_key) do nothing$$
);

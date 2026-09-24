import type { PrismaClient } from "@prisma/client";
import { computeBackoffMs } from "./backoff";
import { PermanentTaskError, TransientTaskError } from "./errors";
import type { TaskRegistry } from "./registry";

// Núcleo da fila. Não importa lib/prisma nem "server-only" de propósito: o
// banco e o registro de tipos chegam por parâmetro, então os testes rodam
// isto contra o projeto Supabase de teste. O app usa os atalhos de
// lib/tasks/index.ts.
//
// Todo horário vem do now() do banco (nunca do relógio do servidor), pra não
// depender de relógio sincronizado entre instâncias.

// Aceita o client normal ou o `tx` de prisma.$transaction — enfileirar
// dentro da transação garante que o registro de negócio e a tarefa são
// gravados juntos (ou nenhum dos dois).
export type TaskDb = Pick<PrismaClient, "$queryRaw" | "$executeRaw">;

// Tarefa em "running" há mais que isso é considerada travada (processo morto
// no meio). Precisa ser maior que o maxDuration da rota (60s) e é o mesmo
// valor usado no SQL do pg_cron (supabase/cron/process_tasks.sql) — mudar
// nos dois lugares juntos.
export const STALE_AFTER_MS = 10 * 60_000;
// Limite de reagendamentos por erro temporário. Passado isso, o erro
// temporário passa a contar como falha comum (consome tentativa).
export const MAX_DEFERRALS = 10;
export const DEFAULT_MAX_ATTEMPTS = 5;
const LAST_ERROR_MAX_LENGTH = 500;
const DONE_RETENTION_DAYS = 30;
const FAILED_RETENTION_DAYS = 90;
const PURGE_LIMIT = 500;

export type TaskStatus = "pending" | "running" | "done" | "failed";

export type EnqueueOptions = {
  companyId?: string | null;
  idempotencyKey?: string;
  runAt?: Date;
  maxAttempts?: number;
};

export type ClaimedTask = {
  id: string;
  companyId: string | null;
  type: string;
  payload: unknown;
  attempts: number;
  maxAttempts: number;
  deferrals: number;
};

export type RunSummary = {
  recovered: number;
  claimed: number;
  done: number;
  retried: number;
  deferred: number;
  failed: number;
  purged: number;
};

function truncateError(message: string): string {
  return message.length > LAST_ERROR_MAX_LENGTH ? `${message.slice(0, LAST_ERROR_MAX_LENGTH - 1)}…` : message;
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return truncateError(`${err.name}: ${err.message}`);
  return truncateError(String(err));
}

// Valida o payload contra o schema do tipo e grava. Com idempotencyKey já
// existente, não faz nada e devolve null.
export async function enqueueTask(
  db: TaskDb,
  registry: TaskRegistry,
  type: string,
  payload: unknown,
  options: EnqueueOptions = {}
): Promise<{ id: string } | null> {
  const def = registry.get(type);
  if (!def) throw new Error(`Tipo de tarefa não registrado: ${type}`);

  const parsed = def.payloadSchema.safeParse(payload);
  if (!parsed.success) throw new Error(`Payload inválido para a tarefa ${type}: ${parsed.error.message}`);

  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) throw new Error("maxAttempts precisa ser inteiro >= 1");

  const rows = await db.$queryRaw<{ id: string }[]>`
    insert into public.background_tasks (company_id, type, payload, max_attempts, run_at, idempotency_key)
    values (
      ${options.companyId ?? null}::uuid,
      ${type},
      ${JSON.stringify(parsed.data ?? {})}::jsonb,
      ${maxAttempts}::int,
      coalesce(${options.runAt ?? null}::timestamptz, now()),
      ${options.idempotencyKey ?? null}
    )
    on conflict (idempotency_key) do nothing
    returning id::text as id
  `;
  return rows[0] ?? null;
}

// Tarefas "running" com lock mais velho que STALE_AFTER_MS voltam pra fila
// (ou falham de vez, se a tentativa travada era a última — a tentativa já
// foi contada quando a tarefa foi pega).
export async function recoverStaleTasks(db: TaskDb, staleAfterMs: number = STALE_AFTER_MS): Promise<number> {
  return db.$executeRaw`
    update public.background_tasks
    set status = case when attempts >= max_attempts then 'failed' else 'pending' end,
        completed_at = case when attempts >= max_attempts then now() else null end,
        run_at = now(),
        locked_at = null,
        locked_by = null,
        last_error = 'Tarefa travada em execução; recuperada automaticamente.'
    where status = 'running'
      and locked_at < now() - (${staleAfterMs}::float8 * interval '1 millisecond')
  `;
}

// Pega até `limit` tarefas prontas num único comando — seguro no transaction
// pooler (nenhuma transação fica aberta enquanto o handler roda). O CTE
// MATERIALIZED garante que a subconsulta com SKIP LOCKED roda uma vez só.
export async function claimTasks(db: TaskDb, workerId: string, limit: number): Promise<ClaimedTask[]> {
  return db.$queryRaw<ClaimedTask[]>`
    with next as materialized (
      select id
      from public.background_tasks
      where status = 'pending' and run_at <= now()
      order by run_at
      limit ${limit}::int
      for update skip locked
    )
    update public.background_tasks t
    set status = 'running',
        locked_at = now(),
        locked_by = ${workerId},
        attempts = t.attempts + 1
    from next
    where t.id = next.id
    returning t.id::text as id,
              t.company_id::text as "companyId",
              t.type,
              t.payload,
              t.attempts,
              t.max_attempts as "maxAttempts",
              t.deferrals
  `;
}

// Todas as transições de saída de "running" exigem que o lock ainda seja
// deste processador: se a tarefa foi recuperada como travada e pega por
// outro, o resultado atrasado deste é descartado (retorna false).

async function markDone(db: TaskDb, task: ClaimedTask, workerId: string): Promise<boolean> {
  const n = await db.$executeRaw`
    update public.background_tasks
    set status = 'done', completed_at = now(), locked_at = null, locked_by = null, last_error = null
    where id = ${task.id}::uuid and status = 'running' and locked_by = ${workerId}
  `;
  return n === 1;
}

async function markFailed(db: TaskDb, task: ClaimedTask, workerId: string, error: string): Promise<boolean> {
  const n = await db.$executeRaw`
    update public.background_tasks
    set status = 'failed', completed_at = now(), locked_at = null, locked_by = null, last_error = ${error}
    where id = ${task.id}::uuid and status = 'running' and locked_by = ${workerId}
  `;
  return n === 1;
}

async function reschedule(
  db: TaskDb,
  task: ClaimedTask,
  workerId: string,
  delayMs: number,
  error: string,
  opts: { refundAttempt: boolean }
): Promise<boolean> {
  const attemptDelta = opts.refundAttempt ? -1 : 0;
  const deferralDelta = opts.refundAttempt ? 1 : 0;
  const n = await db.$executeRaw`
    update public.background_tasks
    set status = 'pending',
        run_at = now() + (${delayMs}::float8 * interval '1 millisecond'),
        attempts = attempts + ${attemptDelta}::int,
        deferrals = deferrals + ${deferralDelta}::int,
        locked_at = null,
        locked_by = null,
        last_error = ${error}
    where id = ${task.id}::uuid and status = 'running' and locked_by = ${workerId}
  `;
  return n === 1;
}

type Outcome = "done" | "retried" | "deferred" | "failed" | "lost";

export async function executeTask(
  db: TaskDb,
  registry: TaskRegistry,
  task: ClaimedTask,
  workerId: string,
  random: () => number = Math.random
): Promise<Outcome> {
  const def = registry.get(task.type);
  if (!def) {
    return (await markFailed(db, task, workerId, `Tipo de tarefa não registrado: ${task.type}`)) ? "failed" : "lost";
  }

  const parsed = def.payloadSchema.safeParse(task.payload);
  if (!parsed.success) {
    return (await markFailed(db, task, workerId, truncateError(`Payload inválido: ${parsed.error.message}`)))
      ? "failed"
      : "lost";
  }

  try {
    await def.handler(parsed.data, {
      taskId: task.id,
      companyId: task.companyId,
      attempt: task.attempts,
      maxAttempts: task.maxAttempts,
    });
  } catch (err) {
    const message = errorMessage(err);

    if (err instanceof PermanentTaskError) {
      return (await markFailed(db, task, workerId, message)) ? "failed" : "lost";
    }

    if (err instanceof TransientTaskError && task.deferrals < MAX_DEFERRALS) {
      const delay = err.retryAfterMs ?? computeBackoffMs(task.deferrals + 1, random);
      return (await reschedule(db, task, workerId, delay, message, { refundAttempt: true })) ? "deferred" : "lost";
    }

    // Falha comum (ou temporária que já passou do limite de reagendamentos).
    if (task.attempts >= task.maxAttempts) {
      return (await markFailed(db, task, workerId, message)) ? "failed" : "lost";
    }
    const delay = computeBackoffMs(task.attempts, random);
    return (await reschedule(db, task, workerId, delay, message, { refundAttempt: false })) ? "retried" : "lost";
  }

  return (await markDone(db, task, workerId)) ? "done" : "lost";
}

// Retenção: done some depois de 30 dias, failed depois de 90 (tempo pro
// ADMIN ver e tentar de novo). Em lotes pra nunca travar a execução.
export async function purgeOldTasks(db: TaskDb): Promise<number> {
  return db.$executeRaw`
    delete from public.background_tasks
    where id in (
      select id from public.background_tasks
      where (status = 'done' and completed_at < now() - (${DONE_RETENTION_DAYS}::int * interval '1 day'))
         or (status = 'failed' and completed_at < now() - (${FAILED_RETENTION_DAYS}::int * interval '1 day'))
      limit ${PURGE_LIMIT}::int
    )
  `;
}

export type RunOptions = {
  workerId: string;
  // Máximo de tarefas por execução.
  batchSize?: number;
  // Para de pegar tarefas novas depois disso (a que está rodando termina).
  // Precisa sobrar folga até o maxDuration da rota.
  timeBudgetMs?: number;
  random?: () => number;
};

// Uma execução do processador: recupera travadas, processa em sequência uma
// a uma (pega a próxima só quando a anterior termina, pra nunca deixar
// tarefa pega e parada esperando), depois limpa as antigas.
export async function runTasks(db: TaskDb, registry: TaskRegistry, opts: RunOptions): Promise<RunSummary> {
  const { workerId, batchSize = 5, timeBudgetMs = 40_000, random } = opts;
  const startedAt = Date.now();
  const summary: RunSummary = { recovered: 0, claimed: 0, done: 0, retried: 0, deferred: 0, failed: 0, purged: 0 };

  summary.recovered = await recoverStaleTasks(db);

  while (summary.claimed < batchSize && Date.now() - startedAt < timeBudgetMs) {
    const [task] = await claimTasks(db, workerId, 1);
    if (!task) break;
    summary.claimed++;

    const outcome = await executeTask(db, registry, task, workerId, random);
    if (outcome !== "lost") summary[outcome]++;
  }

  summary.purged = await purgeOldTasks(db);
  return summary;
}

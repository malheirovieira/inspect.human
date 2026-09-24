import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Testes de integração da fila rodam no SEGUNDO projeto Supabase (só de
// teste), conectando pelo transaction pooler (porta 6543) — o mesmo modo do
// app em produção (lib/prisma.ts), pra concorrência ser testada nas mesmas
// condições. Sem TEST_DATABASE_URL, os testes são pulados.
export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

export const skipReason = TEST_DATABASE_URL
  ? null
  : "TEST_DATABASE_URL não definida — testes de integração da fila PULADOS (ver CONTEXT.md, seção Testes).";

// Projeto Supabase = usuário "postgres.<ref>" no pooler. Mesmo usuário +
// host da produção → recusa, pra nunca limpar a fila de verdade.
function projectKey(url: string): string {
  const u = new URL(url);
  return `${decodeURIComponent(u.username)}@${u.hostname}`;
}

export function assertNotProduction(): void {
  if (!TEST_DATABASE_URL) return;
  for (const prodVar of ["DATABASE_URL", "DIRECT_URL"] as const) {
    const prod = process.env[prodVar];
    if (prod && projectKey(prod) === projectKey(TEST_DATABASE_URL)) {
      throw new Error(`TEST_DATABASE_URL aponta pro mesmo projeto de ${prodVar} — recusando rodar testes que apagam dados.`);
    }
  }
  const port = new URL(TEST_DATABASE_URL).port;
  if (port !== "6543") {
    throw new Error(
      `TEST_DATABASE_URL deve usar o transaction pooler (porta 6543), igual ao app em produção — veio porta ${port || "padrão"}.`
    );
  }
}

// Um client por "processador" simulado — cada um com o próprio pool de
// conexões, como duas instâncias serverless diferentes.
export function createTestClient(): PrismaClient {
  assertNotProduction();
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: TEST_DATABASE_URL! }) });
}

export async function assertSchemaReady(db: PrismaClient): Promise<void> {
  const rows = await db.$queryRaw<{ ok: boolean }[]>`select to_regclass('public.background_tasks') is not null as ok`;
  if (!rows[0]?.ok) {
    throw new Error("Tabela background_tasks não existe no projeto de teste — rode `npm run test:db:setup`.");
  }
}

export async function clearTasks(db: PrismaClient): Promise<void> {
  await db.$executeRaw`delete from public.background_tasks`;
}

// Deixa as tarefas prontas pra rodar já (em vez de esperar o backoff real).
export async function makeAllDue(db: PrismaClient): Promise<void> {
  await db.$executeRaw`update public.background_tasks set run_at = now() where status = 'pending'`;
}

export type TaskRow = {
  id: string;
  status: string;
  attempts: number;
  maxAttempts: number;
  deferrals: number;
  lastError: string | null;
  lockedBy: string | null;
  delayMs: number;
};

export async function getTask(db: PrismaClient, id: string): Promise<TaskRow> {
  const rows = await db.$queryRaw<TaskRow[]>`
    select id::text as id, status, attempts, max_attempts as "maxAttempts", deferrals,
           last_error as "lastError", locked_by as "lockedBy",
           (extract(epoch from (run_at - now())) * 1000)::float8 as "delayMs"
    from public.background_tasks where id = ${id}::uuid
  `;
  if (!rows[0]) throw new Error(`tarefa ${id} não encontrada`);
  return rows[0];
}

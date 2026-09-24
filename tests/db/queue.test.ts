import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { PermanentTaskError, TransientTaskError } from "@/lib/tasks/errors";
import { createTaskRegistry, defineTask, type TaskContext } from "@/lib/tasks/registry";
import {
  MAX_DEFERRALS,
  claimTasks,
  enqueueTask,
  executeTask,
  recoverStaleTasks,
  runTasks,
} from "@/lib/tasks/queue";
import {
  assertSchemaReady,
  clearTasks,
  createTestClient,
  getTask,
  makeAllDue,
  skipReason,
} from "./helpers";

if (skipReason) console.warn(skipReason);

const noJitter = () => 0.5;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Handlers de teste — o comportamento de cada um é controlado pelo payload.
const processed: string[] = [];
let behavior: (ctx: TaskContext) => Promise<void> = async () => {};

const registry = createTaskRegistry([
  defineTask({
    type: "teste.registrar",
    payloadSchema: z.object({ n: z.number() }),
    handler: async (_payload, ctx) => {
      processed.push(ctx.taskId);
      await sleep(20); // simula trabalho real, dá tempo de a concorrência aparecer
    },
  }),
  defineTask({
    type: "teste.controlado",
    payloadSchema: z.object({}),
    handler: async (_payload, ctx) => behavior(ctx),
  }),
]);

describe.skipIf(!!skipReason)("fila de tarefas (Postgres real, transaction pooler)", () => {
  let a: PrismaClient;
  let b: PrismaClient;

  beforeAll(async () => {
    a = createTestClient();
    b = createTestClient();
    await assertSchemaReady(a);
  });

  afterAll(async () => {
    await clearTasks(a);
    await Promise.all([a.$disconnect(), b.$disconnect()]);
  });

  beforeEach(async () => {
    await clearTasks(a);
    processed.length = 0;
    behavior = async () => {};
  });

  async function enqueue(type: string, payload: object, opts?: Parameters<typeof enqueueTask>[4]) {
    const row = await enqueueTask(a, registry, type, payload, opts);
    if (!row) throw new Error("enqueue devolveu null");
    return row.id;
  }

  describe("bloqueio concorrente", () => {
    it("dois processadores pegando ao mesmo tempo nunca recebem a mesma tarefa", async () => {
      const ids = await Promise.all(Array.from({ length: 30 }, (_, n) => enqueue("teste.registrar", { n })));

      // Rodadas de 6 claims simultâneos, alternando os dois clients (pools
      // separados = conexões separadas no pooler), até a fila esvaziar. Com
      // SKIP LOCKED um claim pode voltar com menos de 5 — o que importa é
      // nenhuma tarefa sair duas vezes.
      const claimed: string[] = [];
      for (let round = 0; round < 20; round++) {
        const batches = await Promise.all(
          Array.from({ length: 6 }, (_, i) => claimTasks(i % 2 === 0 ? a : b, `r${round}w${i}`, 5))
        );
        const got = batches.flat().map((t) => t.id);
        if (got.length === 0) break;
        claimed.push(...got);
      }

      expect(new Set(claimed).size).toBe(claimed.length);
      expect(claimed.length).toBe(30);
      expect(new Set(claimed)).toEqual(new Set(ids));
    });

    it("processadores concorrentes executam cada tarefa exatamente uma vez", async () => {
      const ids = await Promise.all(Array.from({ length: 24 }, (_, n) => enqueue("teste.registrar", { n })));

      const runs = await Promise.all(
        Array.from({ length: 4 }, (_, i) =>
          runTasks(i % 2 === 0 ? a : b, registry, { workerId: `run${i}`, batchSize: 24, random: noJitter })
        )
      );

      expect(processed.length).toBe(24);
      expect(new Set(processed)).toEqual(new Set(ids));
      expect(runs.reduce((s, r) => s + r.done, 0)).toBe(24);
      for (const id of ids) expect((await getTask(a, id)).status).toBe("done");
    });

    it("idempotencyKey repetida não cria segunda tarefa", async () => {
      const first = await enqueueTask(a, registry, "teste.registrar", { n: 1 }, { idempotencyKey: "chave-1" });
      const second = await enqueueTask(b, registry, "teste.registrar", { n: 2 }, { idempotencyKey: "chave-1" });
      expect(first).not.toBeNull();
      expect(second).toBeNull();
      const count = await a.$queryRaw<{ n: number }[]>`select count(*)::int as n from public.background_tasks`;
      expect(count[0].n).toBe(1);
    });
  });

  describe("novas tentativas", () => {
    it("erro comum reagenda com espera crescente e falha ao esgotar as tentativas", async () => {
      behavior = async () => {
        throw new Error("falhou de propósito");
      };
      const id = await enqueue("teste.controlado", {}, { maxAttempts: 3 });

      await runTasks(a, registry, { workerId: "w", random: noJitter });
      let t = await getTask(a, id);
      expect(t).toMatchObject({ status: "pending", attempts: 1, deferrals: 0 });
      expect(t.lastError).toContain("falhou de propósito");
      expect(t.delayMs).toBeGreaterThan(28_000); // ~30s
      expect(t.delayMs).toBeLessThanOrEqual(30_000);

      await makeAllDue(a);
      await runTasks(a, registry, { workerId: "w", random: noJitter });
      t = await getTask(a, id);
      expect(t).toMatchObject({ status: "pending", attempts: 2 });
      expect(t.delayMs).toBeGreaterThan(118_000); // ~2min
      expect(t.delayMs).toBeLessThanOrEqual(120_000);

      await makeAllDue(a);
      await runTasks(a, registry, { workerId: "w", random: noJitter });
      t = await getTask(a, id);
      expect(t).toMatchObject({ status: "failed", attempts: 3, lockedBy: null });
    });

    it("tarefa agendada no futuro não é pega antes da hora", async () => {
      await enqueue("teste.registrar", { n: 1 }, { runAt: new Date(Date.now() + 60 * 60_000) });
      const summary = await runTasks(a, registry, { workerId: "w" });
      expect(summary.claimed).toBe(0);
    });

    it("PermanentTaskError falha na hora, sem nova tentativa", async () => {
      behavior = async () => {
        throw new PermanentTaskError("não adianta tentar");
      };
      const id = await enqueue("teste.controlado", {});
      await runTasks(a, registry, { workerId: "w" });
      expect(await getTask(a, id)).toMatchObject({ status: "failed", attempts: 1 });
    });

    it("tipo desconhecido falha na hora", async () => {
      const rows = await a.$queryRaw<{ id: string }[]>`
        insert into public.background_tasks (type) values ('teste.naoexiste') returning id::text as id
      `;
      await runTasks(a, registry, { workerId: "w" });
      const t = await getTask(a, rows[0].id);
      expect(t.status).toBe("failed");
      expect(t.lastError).toMatch(/não registrado/);
    });
  });

  describe("erro temporário (ex.: HTTP 429)", () => {
    it("reagenda sem consumir tentativa, respeitando Retry-After", async () => {
      behavior = async () => {
        throw new TransientTaskError("HTTP 429", { retryAfterMs: 90_000 });
      };
      const id = await enqueue("teste.controlado", {}, { maxAttempts: 2 });

      await runTasks(a, registry, { workerId: "w", random: noJitter });
      const t = await getTask(a, id);
      expect(t).toMatchObject({ status: "pending", attempts: 0, deferrals: 1 });
      expect(t.delayMs).toBeGreaterThan(88_000);
      expect(t.delayMs).toBeLessThanOrEqual(90_000);
    });

    it("passado o limite de reagendamentos, passa a consumir tentativa até falhar", async () => {
      behavior = async () => {
        throw new TransientTaskError("HTTP 429");
      };
      const id = await enqueue("teste.controlado", {}, { maxAttempts: 2 });

      for (let i = 0; i < MAX_DEFERRALS; i++) {
        await runTasks(a, registry, { workerId: "w", random: noJitter });
        await makeAllDue(a);
      }
      expect(await getTask(a, id)).toMatchObject({ status: "pending", attempts: 0, deferrals: MAX_DEFERRALS });

      await runTasks(a, registry, { workerId: "w", random: noJitter });
      expect(await getTask(a, id)).toMatchObject({ status: "pending", attempts: 1, deferrals: MAX_DEFERRALS });

      await makeAllDue(a);
      await runTasks(a, registry, { workerId: "w", random: noJitter });
      expect(await getTask(a, id)).toMatchObject({ status: "failed", attempts: 2, deferrals: MAX_DEFERRALS });
    });

    it("erro temporário seguido de sucesso conclui a tarefa", async () => {
      let calls = 0;
      behavior = async () => {
        calls++;
        if (calls === 1) throw new TransientTaskError("HTTP 429", { retryAfterMs: 0 });
      };
      const id = await enqueue("teste.controlado", {});
      await runTasks(a, registry, { workerId: "w" });
      expect(await getTask(a, id)).toMatchObject({ status: "done", attempts: 1, deferrals: 1 });
    });
  });

  describe("recuperação de tarefa travada", () => {
    async function simulateStuck(id: string, attempts: number, lockedMinutesAgo: number) {
      await a.$executeRaw`
        update public.background_tasks
        set status = 'running', attempts = ${attempts}::int, locked_by = 'processo-morto',
            locked_at = now() - (${lockedMinutesAgo}::int * interval '1 minute')
        where id = ${id}::uuid
      `;
    }

    it("running há mais de 10 min volta pra pending e é processada", async () => {
      const id = await enqueue("teste.registrar", { n: 1 });
      await simulateStuck(id, 1, 11);

      const summary = await runTasks(a, registry, { workerId: "w" });
      expect(summary.recovered).toBe(1);
      expect(await getTask(a, id)).toMatchObject({ status: "done", attempts: 2 });
    });

    it("running recente (menos de 10 min) não é mexida", async () => {
      const id = await enqueue("teste.registrar", { n: 1 });
      await simulateStuck(id, 1, 5);

      expect(await recoverStaleTasks(a)).toBe(0);
      expect(await getTask(a, id)).toMatchObject({ status: "running", lockedBy: "processo-morto" });
    });

    it("travada na última tentativa vai pra failed", async () => {
      const id = await enqueue("teste.registrar", { n: 1 }, { maxAttempts: 2 });
      await simulateStuck(id, 2, 11);

      expect(await recoverStaleTasks(a)).toBe(1);
      const t = await getTask(a, id);
      expect(t.status).toBe("failed");
      expect(t.lastError).toMatch(/travada/);
    });

    it("processador antigo que termina depois da recuperação não sobrescreve o novo", async () => {
      const id = await enqueue("teste.registrar", { n: 1 });
      const [stale] = await claimTasks(a, "antigo", 1);

      // O "antigo" some por mais de 10 min; a tarefa é recuperada e pega por outro.
      await a.$executeRaw`update public.background_tasks set locked_at = now() - interval '11 minutes' where id = ${id}::uuid`;
      await recoverStaleTasks(a);
      const [fresh] = await claimTasks(b, "novo", 1);
      expect(fresh.id).toBe(id);

      // O antigo volta e tenta gravar o resultado: descartado.
      const outcome = await executeTask(a, registry, stale, "antigo");
      expect(outcome).toBe("lost");
      expect(await getTask(a, id)).toMatchObject({ status: "running", lockedBy: "novo" });
    });
  });
});

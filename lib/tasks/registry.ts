import type { z } from "zod";

// Contexto entregue ao handler. O payload já chega validado pelo schema do
// tipo.
export type TaskContext = {
  taskId: string;
  companyId: string | null;
  // Número da tentativa atual (1 na primeira execução).
  attempt: number;
  maxAttempts: number;
};

// Esta é a última tentativa? (uma falha comum agora vira `failed` de vez)
export function isLastAttempt(ctx: TaskContext): boolean {
  return ctx.attempt >= ctx.maxAttempts;
}

export type TaskDefinition<S extends z.ZodType = z.ZodType> = {
  type: string;
  payloadSchema: S;
  // Pode rodar mais de uma vez pra mesma tarefa (ex.: execução recuperada
  // depois de travar) — tem que ser idempotente. Ver lib/tasks/errors.ts pra
  // controlar como uma falha é tratada.
  handler: (payload: z.infer<S>, ctx: TaskContext) => Promise<void>;
};

export type TaskRegistry = ReadonlyMap<string, TaskDefinition>;

// Só pra inferir o tipo do payload no handler a partir do schema.
export function defineTask<S extends z.ZodType>(def: TaskDefinition<S>): TaskDefinition<S> {
  return def;
}

export function createTaskRegistry(defs: readonly TaskDefinition<any>[]): TaskRegistry {
  const map = new Map<string, TaskDefinition>();
  for (const def of defs) {
    if (map.has(def.type)) throw new Error(`Tipo de tarefa duplicado no registro: ${def.type}`);
    map.set(def.type, def as TaskDefinition);
  }
  return map;
}

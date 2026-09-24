import "server-only";
import { prisma } from "@/lib/prisma";
import { TASK_DEFINITIONS } from "./handlers";
import { createTaskRegistry } from "./registry";
import { enqueueTask, runTasks, type EnqueueOptions, type RunOptions, type TaskDb } from "./queue";

// Ponto de entrada da fila pro app — já ligado ao Prisma e ao registro de
// tipos. O núcleo (queue.ts) fica sem esses imports pra poder ser testado.
export const taskRegistry = createTaskRegistry(TASK_DEFINITIONS);

// Passe `tx` (de prisma.$transaction) pra gravar a tarefa na mesma
// transação da mudança que a originou.
export function enqueue(type: string, payload: unknown, options?: EnqueueOptions, tx?: TaskDb) {
  return enqueueTask(tx ?? prisma, taskRegistry, type, payload, options);
}

export function processTasks(options: RunOptions) {
  return runTasks(prisma, taskRegistry, options);
}

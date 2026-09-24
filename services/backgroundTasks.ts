import "server-only";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import type { TaskStatus } from "@/lib/tasks/queue";

export const TASK_STATUSES: TaskStatus[] = ["pending", "running", "done", "failed"];

export type FailedTaskRow = {
  id: string;
  type: string;
  lastError: string | null;
  attempts: number;
  maxAttempts: number;
  updatedAt: string;
};

// Tela Configurações > Tarefas (só ADMIN). Só tarefas da empresa da sessão —
// tarefas de sistema (company_id null) não aparecem. Payload nunca sai daqui
// (pode ter dado pessoal).
export async function getTaskOverview(): Promise<{
  counts: Record<TaskStatus, number>;
  failures: FailedTaskRow[];
}> {
  const session = await requireRole(["ADMIN"]);

  const [grouped, failures] = await Promise.all([
    prisma.backgroundTask.groupBy({
      by: ["status"],
      where: { companyId: session.companyId },
      _count: { _all: true },
    }),
    prisma.backgroundTask.findMany({
      where: { companyId: session.companyId, status: "failed" },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: { id: true, type: true, lastError: true, attempts: true, maxAttempts: true, updatedAt: true },
    }),
  ]);

  const counts = { pending: 0, running: 0, done: 0, failed: 0 } as Record<TaskStatus, number>;
  for (const g of grouped) {
    if (TASK_STATUSES.includes(g.status as TaskStatus)) counts[g.status as TaskStatus] = g._count._all;
  }

  return {
    counts,
    failures: failures.map((f) => ({ ...f, updatedAt: f.updatedAt.toISOString() })),
  };
}

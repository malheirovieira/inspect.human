"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

export type ActionResult = { error: string } | { success: true };

// "Tentar novamente" de uma tarefa que falhou: volta pra fila do zero
// (tentativas e reagendamentos zerados), pra rodar na próxima execução.
export async function retryBackgroundTask(taskId: string): Promise<ActionResult> {
  const session = await requireRole(["ADMIN"]);

  // updateMany com companyId + status no where: só mexe se a tarefa é da
  // empresa da sessão E ainda está failed (dois cliques seguidos não
  // reenfileiram duas vezes).
  const { count } = await prisma.backgroundTask.updateMany({
    where: { id: taskId, companyId: session.companyId, status: "failed" },
    data: {
      status: "pending",
      attempts: 0,
      deferrals: 0,
      runAt: new Date(),
      lockedAt: null,
      lockedBy: null,
      completedAt: null,
    },
  });
  if (count === 0) return { error: "Tarefa não encontrada ou já reenviada." };

  revalidatePath("/configuracoes/tarefas");
  return { success: true };
}

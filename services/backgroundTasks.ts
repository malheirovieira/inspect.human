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
  // resume.analyze: perfil do candidato — nova geração se pede lá ("Tentar
  // novamente" do card), não reenviando a tarefa (a análise já está FAILED).
  candidateHref: string | null;
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
      select: { id: true, type: true, payload: true, lastError: true, attempts: true, maxAttempts: true, updatedAt: true },
    }),
  ]);

  const counts = { pending: 0, running: 0, done: 0, failed: 0 } as Record<TaskStatus, number>;
  for (const g of grouped) {
    if (TASK_STATUSES.includes(g.status as TaskStatus)) counts[g.status as TaskStatus] = g._count._all;
  }

  // Falhas de resumo por IA → link pro perfil da pessoa.
  const analysisIds = failures
    .filter((f) => f.type === "resume.analyze")
    .map((f) => (f.payload as { analysisId?: string } | null)?.analysisId)
    .filter((id): id is string => typeof id === "string");
  const analyses = analysisIds.length
    ? await prisma.resumeAnalysis.findMany({
        where: { id: { in: analysisIds }, companyId: session.companyId },
        select: { id: true, resume: { select: { candidateId: true } } },
      })
    : [];
  const candidateByAnalysis = new Map(analyses.map((a) => [a.id, a.resume.candidateId]));

  return {
    counts,
    failures: failures.map(({ payload, ...f }) => {
      const analysisId = (payload as { analysisId?: string } | null)?.analysisId;
      const candidateId = analysisId ? candidateByAnalysis.get(analysisId) : undefined;
      return {
        ...f,
        updatedAt: f.updatedAt.toISOString(),
        candidateHref: candidateId ? `/recrutamento/banco-de-talentos/${candidateId}` : null,
      };
    }),
  };
}

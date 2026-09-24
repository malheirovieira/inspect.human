import type { PrismaClient } from "@prisma/client";
import { RESUME_VERSION_RETENTION_MONTHS } from "./retention";

// Limpeza de versões SUBSTITUÍDAS do currículo (tarefa resume.purge_versions,
// enfileirada 1x por dia pelo pg_cron — supabase/cron/process_tasks.sql).
// Apaga arquivo + linha (texto extraído e análises vão junto, por cascade).
//
// Mantém: a versão atual de qualquer pessoa, e versões enviadas com
// candidatura ainda em andamento (etapa diferente de HIRED/REJECTED).
// Prazo PROVISÓRIO — ver lib/resumes/retention.ts (pendente jurídico).

export type PurgeDeps = {
  db: PrismaClient;
  removeFiles(paths: string[]): Promise<void>;
  now?: Date;
};

const BATCH = 100;

export async function purgeSupersededResumes(
  deps: PurgeDeps,
  retentionMonths: number = RESUME_VERSION_RETENTION_MONTHS
): Promise<number> {
  const cutoff = new Date(deps.now ?? new Date());
  cutoff.setMonth(cutoff.getMonth() - retentionMonths);

  const expired = await deps.db.candidateResume.findMany({
    where: {
      supersededAt: { lt: cutoff },
      currentFor: { none: {} },
      applications: { none: { stage: { notIn: ["HIRED", "REJECTED"] } } },
    },
    select: { id: true, storagePath: true },
    take: BATCH,
  });
  if (expired.length === 0) return 0;

  // Arquivo primeiro: se o Storage falhar, a tarefa tenta de novo e a linha
  // continua lá apontando pro arquivo (nunca sobra arquivo sem dono conhecido).
  await deps.removeFiles(expired.map((r) => r.storagePath));
  const { count } = await deps.db.candidateResume.deleteMany({ where: { id: { in: expired.map((r) => r.id) } } });
  return count;
}

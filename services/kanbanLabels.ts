import "server-only";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { CANDIDATE_STAGES, STAGE_LABELS } from "@/schemas/candidate";

// Rótulos exibidos nas colunas do Kanban: o padrão do sistema (STAGE_LABELS),
// sobrescrito por qualquer customização que a empresa tenha salvo.
export async function getKanbanStageLabels(): Promise<Record<(typeof CANDIDATE_STAGES)[number], string>> {
  const session = await requireRole(["ADMIN", "HR"]);
  const overrides = await prisma.kanbanStageLabel.findMany({ where: { companyId: session.companyId } });

  const labels = { ...STAGE_LABELS };
  for (const override of overrides) {
    if (CANDIDATE_STAGES.includes(override.stage as (typeof CANDIDATE_STAGES)[number])) {
      labels[override.stage as (typeof CANDIDATE_STAGES)[number]] = override.label;
    }
  }
  return labels;
}

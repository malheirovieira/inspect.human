import "server-only";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

export type ExitFilters = { q?: string; exitType?: string; reason?: string };

export async function listEmployeeExits(filters: ExitFilters = {}) {
  const session = await requireRole(["ADMIN", "HR"]);
  const { q, exitType, reason } = filters;

  return prisma.employeeExit.findMany({
    where: {
      companyId: session.companyId,
      ...(exitType ? { exitType } : {}),
      ...(reason ? { reason } : {}),
      ...(q ? { userName: { contains: q, mode: "insensitive" } } : {}),
    },
    orderBy: { exitDate: "desc" },
  });
}

// Sem filtro de período — a página de KPIs recorta por competência em memória.
export async function listAllEmployeeExitsForKpis(companyId: string) {
  return prisma.employeeExit.findMany({ where: { companyId } });
}

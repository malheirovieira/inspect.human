import "server-only";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

export type ColaboradorFilters = { q?: string; role?: string; status?: string; department?: string };

export async function listColaboradores(filters: ColaboradorFilters = {}) {
  const session = await requireRole(["ADMIN", "HR"]);
  const { q, role, status, department } = filters;

  return prisma.user.findMany({
    where: {
      companyId: session.companyId,
      ...(role ? { role } : {}),
      ...(department ? { department } : {}),
      ...(status === "active" ? { active: true } : status === "inactive" ? { active: false } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { position: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
  });
}

export async function getColaborador(id: string) {
  const session = await requireRole(["ADMIN", "HR"]);
  return prisma.user.findFirst({ where: { id, companyId: session.companyId } });
}

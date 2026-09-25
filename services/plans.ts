import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { getPlan, type Plan } from "@/lib/plans";

// Plano atual da empresa. cache() = uma consulta por requisição, mesmo com
// o botão Upgrade (barra superior) e a página pedindo o mesmo dado.
export const getCompanyPlan = cache(async (companyId: string): Promise<Plan> => {
  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { plan: true } });
  return getPlan(company?.plan);
});

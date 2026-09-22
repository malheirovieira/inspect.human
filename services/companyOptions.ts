import "server-only";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

export const OPTION_CATEGORIES = ["SETOR", "HORARIO_TRABALHO", "MODALIDADE_CONTRATACAO"] as const;
export type OptionCategory = (typeof OPTION_CATEGORIES)[number];

export async function listCompanyOptions(category: OptionCategory) {
  const session = await requireSession();
  return prisma.companyOption.findMany({
    where: { companyId: session.companyId, category, active: true },
    orderBy: { label: "asc" },
  });
}

// Todas as três categorias de uma vez — usado pela tela de Configurações.
export async function listAllCompanyOptions() {
  const session = await requireSession();
  const options = await prisma.companyOption.findMany({
    where: { companyId: session.companyId, active: true },
    orderBy: { label: "asc" },
  });
  return {
    SETOR: options.filter((o) => o.category === "SETOR"),
    HORARIO_TRABALHO: options.filter((o) => o.category === "HORARIO_TRABALHO"),
    MODALIDADE_CONTRATACAO: options.filter((o) => o.category === "MODALIDADE_CONTRATACAO"),
  };
}

import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";

// Empresa atual — memoizada por requisição (React cache). Qualquer parte do
// servidor que precisar de dados da empresa usa esta função em vez de
// consultar o Prisma diretamente, garantindo no máximo 1 query por
// requisição, mesmo com layout + UpgradeButton + página pedindo o mesmo dado.
//
// Antes: layout, vaga e UpgradeButton faziam 2–3 prisma.company.findUnique()
// separados por requisição (selects diferentes, cache() não ajudava).
// Depois: todos chamam getCompany(); a segunda chamada retorna do cache.
export const getCompany = cache(async (companyId: string) => {
  return prisma.company.findUnique({ where: { id: companyId } });
});

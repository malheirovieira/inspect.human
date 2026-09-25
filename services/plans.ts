import "server-only";
import { cache } from "react";
import { getPlan, type Plan } from "@/lib/plans";
import { getCompany } from "@/services/company";

// Plano atual da empresa. Deriva de getCompany() (já cacheada) para não
// duplicar a query de company — se layout ou vaga já buscaram a empresa
// nesta requisição, getCompany() retorna do cache sem bater no banco.
export const getCompanyPlan = cache(async (companyId: string): Promise<Plan> => {
  const company = await getCompany(companyId);
  return getPlan(company?.plan);
});

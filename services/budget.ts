import "server-only";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { SALARIO_CATEGORY, competenceToDate } from "@/schemas/budget";

export type DepartmentBudgetSummary = {
  department: string;
  categories: Record<string, { allocated: number; consumed: number }>;
};

// Visão consolidada: pra cada departamento (com colaborador ou orçamento
// cadastrado), quanto foi alocado x consumido em cada categoria, no mês
// (competência) informado. Salário é sempre a folha atual dos colaboradores
// ativos do departamento — não olha o mês, é o custo corrente. As demais
// categorias são livres, cadastradas pelo usuário em Configurações — a lista
// é a união das categorias cadastradas com as que já têm orçamento/gasto
// lançado (pra não sumir histórico de uma categoria removida depois).
export async function getBudgetSummary(competence: string) {
  const session = await requireRole(["ADMIN", "HR"]);
  const competenceDate = competenceToDate(competence);
  const monthStart = new Date(Date.UTC(competenceDate.getUTCFullYear(), competenceDate.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(competenceDate.getUTCFullYear(), competenceDate.getUTCMonth() + 1, 1));

  const [colaboradores, candidateBudgets, expenses, categoryOptions] = await Promise.all([
    prisma.user.findMany({
      where: { companyId: session.companyId, active: true, department: { not: null } },
      select: { department: true, salary: true },
    }),
    // Vigente no mês: começou até o fim do mês e (sem data de término ou
    // termina dentro/depois do mês), e está ATIVO. Mais recente primeiro,
    // pra pegar o registro certo quando há mais de um por depto/categoria.
    prisma.budget.findMany({
      where: {
        companyId: session.companyId,
        status: "ATIVO",
        startDate: { lt: monthEnd },
        OR: [{ endDate: null }, { endDate: { gte: monthStart } }],
      },
      orderBy: { startDate: "desc" },
    }),
    prisma.budgetExpense.findMany({
      where: {
        companyId: session.companyId,
        expenseDate: { gte: monthStart, lt: monthEnd },
      },
    }),
    prisma.companyOption.findMany({
      where: { companyId: session.companyId, category: "CATEGORIA_BUDGET", active: true },
      select: { label: true },
    }),
  ]);

  const categoryKeys = Array.from(
    new Set([
      SALARIO_CATEGORY,
      ...categoryOptions.map((o) => o.label),
      ...candidateBudgets.map((b) => b.category),
      ...expenses.map((e) => e.category),
    ])
  );

  // O primeiro (mais recente) por depto+categoria é o vigente.
  const effectiveBudgets = new Map<string, (typeof candidateBudgets)[number]>();
  for (const b of candidateBudgets) {
    const key = `${b.department}|${b.category}`;
    if (!effectiveBudgets.has(key)) effectiveBudgets.set(key, b);
  }

  const departments = new Set<string>();
  colaboradores.forEach((c) => c.department && departments.add(c.department));
  candidateBudgets.forEach((b) => departments.add(b.department));
  expenses.forEach((e) => departments.add(e.department));

  const summary: DepartmentBudgetSummary[] = Array.from(departments)
    .sort()
    .map((department) => {
      const salarioConsumed = colaboradores
        .filter((c) => c.department === department)
        .reduce((sum, c) => sum + Number(c.salary ?? 0), 0);

      const categories = {} as DepartmentBudgetSummary["categories"];
      for (const category of categoryKeys) {
        const allocated = Number(effectiveBudgets.get(`${department}|${category}`)?.amount ?? 0);
        const consumed =
          category === SALARIO_CATEGORY
            ? salarioConsumed
            : expenses
                .filter((e) => e.department === department && e.category === category)
                .reduce((sum, e) => sum + Number(e.amount), 0);
        categories[category] = { allocated, consumed };
      }

      return { department, categories };
    });

  return summary;
}

export type BudgetFilters = { department?: string; status?: string };

// Lista "crua" dos registros de orçamento (com vigência), pra tela de
// consulta/edição — diferente de getBudgetSummary, que já calcula o
// vigente-do-mês pra exibir num resumo.
export async function listBudgets(filters: BudgetFilters = {}) {
  const session = await requireRole(["ADMIN", "HR"]);
  const { department, status } = filters;

  return prisma.budget.findMany({
    where: {
      companyId: session.companyId,
      ...(department ? { department } : {}),
      ...(status ? { status } : {}),
    },
    orderBy: [{ department: "asc" }, { category: "asc" }, { startDate: "desc" }],
  });
}

export async function getBudget(id: string) {
  const session = await requireRole(["ADMIN", "HR"]);
  return prisma.budget.findFirst({ where: { id, companyId: session.companyId } });
}

export async function listBudgetExpenses(competence: string) {
  const session = await requireRole(["ADMIN", "HR"]);
  const competenceDate = competenceToDate(competence);
  const monthStart = new Date(Date.UTC(competenceDate.getUTCFullYear(), competenceDate.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(competenceDate.getUTCFullYear(), competenceDate.getUTCMonth() + 1, 1));

  return prisma.budgetExpense.findMany({
    where: { companyId: session.companyId, expenseDate: { gte: monthStart, lt: monthEnd } },
    orderBy: { expenseDate: "desc" },
  });
}

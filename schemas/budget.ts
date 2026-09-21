import { z } from "zod";

// Salário não é uma categoria cadastrável — é calculada automaticamente a
// partir da folha dos colaboradores ativos do departamento (services/budget.ts)
// e nunca aceita lançamento manual de gasto.
export const SALARIO_CATEGORY = "SALARIO";

const FIXED_CATEGORY_LABELS: Record<string, string> = {
  SALARIO: "Salário",
};

// Categorias além de Salário são livres — cadastradas pelo usuário em
// Configurações (CompanyOption, categoria CATEGORIA_BUDGET). O rótulo
// exibido é o próprio nome cadastrado.
export function categoryLabel(category: string): string {
  return FIXED_CATEGORY_LABELS[category] ?? category;
}

export const BUDGET_STATUSES = ["ATIVO", "SUSPENSO"] as const;

export const BUDGET_STATUS_LABELS: Record<(typeof BUDGET_STATUSES)[number], string> = {
  ATIVO: "Ativo",
  SUSPENSO: "Suspenso",
};

export const createBudgetSchema = z.object({
  department: z.string().min(1, "Departamento é obrigatório"),
  category: z.string().min(1, "Categoria é obrigatória"),
  amount: z.coerce.number().positive("Valor deve ser maior que zero"),
  startDate: z.string().min(1, "Data de início é obrigatória"), // "YYYY-MM-DD"
  endDate: z.string().optional(), // "YYYY-MM-DD" ou vazio = sem data de término
});

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;

export const updateBudgetSchema = createBudgetSchema.extend({
  status: z.enum(BUDGET_STATUSES),
});

export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;

export const createBudgetExpenseSchema = z.object({
  department: z.string().min(1, "Departamento é obrigatório"),
  category: z.string().min(1, "Categoria é obrigatória").refine((c) => c !== SALARIO_CATEGORY, {
    message: "Salário é calculado automaticamente e não aceita lançamento manual.",
  }),
  description: z.string().optional(),
  amount: z.coerce.number().positive("Valor deve ser maior que zero"),
  expenseDate: z.string().min(1, "Data é obrigatória"),
});

export type CreateBudgetExpenseInput = z.infer<typeof createBudgetExpenseSchema>;

// "YYYY-MM" -> primeiro dia do mês (o que o banco espera em `competence`).
export function competenceToDate(competence: string): Date {
  return new Date(`${competence}-01T00:00:00Z`);
}

export function dateToCompetence(date: Date): string {
  return date.toISOString().slice(0, 7);
}

export function currentCompetence(): string {
  return dateToCompetence(new Date());
}

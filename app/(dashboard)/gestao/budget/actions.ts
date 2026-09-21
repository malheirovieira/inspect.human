"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import {
  createBudgetSchema,
  updateBudgetSchema,
  createBudgetExpenseSchema,
  type CreateBudgetInput,
  type UpdateBudgetInput,
  type CreateBudgetExpenseInput,
} from "@/schemas/budget";

export type ActionResult = { error: string } | { success: true };

export async function createBudget(input: CreateBudgetInput): Promise<ActionResult> {
  const session = await requireRole(["ADMIN", "HR"]);

  const parsed = createBudgetSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;

  if (data.endDate && data.endDate < data.startDate) {
    return { error: "A data de término não pode ser antes da data de início." };
  }

  await prisma.budget.create({
    data: {
      companyId: session.companyId,
      department: data.department,
      category: data.category,
      amount: data.amount,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : null,
    },
  });

  revalidatePath("/gestao/budget");
  revalidatePath("/gestao/relatorios");
  revalidatePath("/gestao/kpis");
  return { success: true };
}

export async function updateBudget(id: string, input: UpdateBudgetInput): Promise<ActionResult> {
  const session = await requireRole(["ADMIN", "HR"]);

  const parsed = updateBudgetSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;

  if (data.endDate && data.endDate < data.startDate) {
    return { error: "A data de término não pode ser antes da data de início." };
  }

  const budget = await prisma.budget.findFirst({ where: { id, companyId: session.companyId } });
  if (!budget) return { error: "Orçamento não encontrado." };

  await prisma.budget.update({
    where: { id },
    data: {
      department: data.department,
      category: data.category,
      amount: data.amount,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : null,
      status: data.status,
      updatedAt: new Date(),
    },
  });

  revalidatePath("/gestao/budget");
  revalidatePath("/gestao/relatorios");
  revalidatePath("/gestao/kpis");
  return { success: true };
}

export async function setBudgetStatus(id: string, status: "ATIVO" | "SUSPENSO"): Promise<ActionResult> {
  const session = await requireRole(["ADMIN", "HR"]);

  const budget = await prisma.budget.findFirst({ where: { id, companyId: session.companyId } });
  if (!budget) return { error: "Orçamento não encontrado." };

  await prisma.budget.update({ where: { id }, data: { status, updatedAt: new Date() } });

  revalidatePath("/gestao/budget");
  revalidatePath("/gestao/relatorios");
  revalidatePath("/gestao/kpis");
  return { success: true };
}

export async function createBudgetExpense(input: CreateBudgetExpenseInput): Promise<ActionResult> {
  const session = await requireRole(["ADMIN", "HR"]);

  const parsed = createBudgetExpenseSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;

  await prisma.budgetExpense.create({
    data: {
      companyId: session.companyId,
      department: data.department,
      category: data.category,
      description: data.description || null,
      amount: data.amount,
      expenseDate: new Date(data.expenseDate),
    },
  });

  revalidatePath("/gestao/budget");
  revalidatePath("/gestao/relatorios");
  return { success: true };
}

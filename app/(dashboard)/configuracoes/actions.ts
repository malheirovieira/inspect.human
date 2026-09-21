"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { OPTION_CATEGORIES, type OptionCategory } from "@/services/companyOptions";

export type ActionResult = { error: string } | { success: true };

export async function createCompanyOption(category: OptionCategory, label: string): Promise<ActionResult> {
  const session = await requireRole(["ADMIN", "HR"]);

  if (!OPTION_CATEGORIES.includes(category)) return { error: "Categoria inválida." };
  const trimmed = label.trim();
  if (!trimmed) return { error: "Digite um nome antes de adicionar." };

  const existing = await prisma.companyOption.findFirst({
    where: { companyId: session.companyId, category, label: trimmed },
  });
  if (existing) {
    if (existing.active) return { error: "Essa opção já existe." };
    await prisma.companyOption.update({ where: { id: existing.id }, data: { active: true } });
  } else {
    await prisma.companyOption.create({ data: { companyId: session.companyId, category, label: trimmed } });
  }

  revalidatePath("/configuracoes");
  return { success: true };
}

export async function deleteCompanyOption(optionId: string): Promise<ActionResult> {
  const session = await requireRole(["ADMIN", "HR"]);

  const option = await prisma.companyOption.findFirst({ where: { id: optionId, companyId: session.companyId } });
  if (!option) return { error: "Opção não encontrada." };

  await prisma.companyOption.update({ where: { id: optionId }, data: { active: false } });

  revalidatePath("/configuracoes");
  return { success: true };
}

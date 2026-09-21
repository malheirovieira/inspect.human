"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { createEmployeeExitSchema, type CreateEmployeeExitInput } from "@/schemas/employeeExit";

export type ActionResult = { error: string } | { success: true };

// Registra o desligamento: guarda uma foto do colaborador (sobrevive a uma
// exclusão de cadastro futura) e marca o usuário como inativo. Não exclui o
// cadastro — isso continua sendo uma ação separada e explícita.
export async function createEmployeeExit(input: CreateEmployeeExitInput): Promise<ActionResult> {
  const session = await requireRole(["ADMIN", "HR"]);

  const parsed = createEmployeeExitSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;

  const colaborador = await prisma.user.findFirst({
    where: { id: data.userId, companyId: session.companyId, active: true },
  });
  if (!colaborador) return { error: "Colaborador não encontrado ou já desligado." };

  const existing = await prisma.employeeExit.findUnique({ where: { userId: colaborador.id } });
  if (existing) return { error: "Esse colaborador já tem um desligamento registrado." };

  await prisma.$transaction([
    prisma.employeeExit.create({
      data: {
        companyId: session.companyId,
        userId: colaborador.id,
        userName: colaborador.name,
        department: colaborador.department,
        position: colaborador.position,
        admissionDate: colaborador.admissionDate,
        exitDate: new Date(data.exitDate),
        exitType: data.exitType,
        reason: data.reason,
        notes: data.notes || null,
        rehireEligible: data.rehireEligible,
        createdById: session.userId,
      },
    }),
    prisma.user.update({ where: { id: colaborador.id }, data: { active: false } }),
  ]);

  revalidatePath("/desligamentos");
  revalidatePath("/colaboradores");
  revalidatePath("/gestao/kpis");
  return { success: true };
}

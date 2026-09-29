"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, requireSession } from "@/lib/session";

type ActionResult = { success: true } | { success: false; error: string };

// Lista completa (admin) — inclui inativos, ordenada por posição.
export async function listPartners() {
  await requireRole(["SUPERADMIN"]);
  return prisma.partner.findMany({ orderBy: { position: "asc" } });
}

// Só os ativos — tela de Início, qualquer usuário autenticado da empresa.
export async function listActivePartners() {
  await requireSession();
  return prisma.partner.findMany({ where: { active: true }, orderBy: { position: "asc" } });
}

export async function createPartner(data: { name: string; imageUrl: string; linkUrl: string }): Promise<ActionResult> {
  try {
    await requireRole(["SUPERADMIN"]);

    const name = data.name.trim();
    const imageUrl = data.imageUrl.trim();
    const linkUrl = data.linkUrl.trim();
    if (!name) return { success: false, error: "Nome obrigatório" };
    if (!imageUrl) return { success: false, error: "Imagem obrigatória" };
    if (!linkUrl) return { success: false, error: "Link obrigatório" };

    const last = await prisma.partner.findFirst({ orderBy: { position: "desc" } });

    await prisma.partner.create({
      data: { name, imageUrl, linkUrl, position: last ? last.position + 1 : 0 },
    });

    revalidatePath("/admin/parceiros");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    console.error("[createPartner]", err);
    return { success: false, error: "Erro ao criar parceiro" };
  }
}

export async function updatePartner(
  id: string,
  data: { name?: string; imageUrl?: string; linkUrl?: string; active?: boolean }
): Promise<ActionResult> {
  try {
    await requireRole(["SUPERADMIN"]);

    await prisma.partner.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl.trim() }),
        ...(data.linkUrl !== undefined && { linkUrl: data.linkUrl.trim() }),
        ...(data.active !== undefined && { active: data.active }),
        updatedAt: new Date(),
      },
    });

    revalidatePath("/admin/parceiros");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    console.error("[updatePartner]", err);
    return { success: false, error: "Erro ao atualizar parceiro" };
  }
}

export async function deletePartner(id: string): Promise<ActionResult> {
  try {
    await requireRole(["SUPERADMIN"]);
    await prisma.partner.delete({ where: { id } });

    revalidatePath("/admin/parceiros");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    console.error("[deletePartner]", err);
    return { success: false, error: "Erro ao excluir parceiro" };
  }
}

export async function reorderPartners(orderedIds: string[]): Promise<ActionResult> {
  try {
    await requireRole(["SUPERADMIN"]);

    await prisma.$transaction(
      orderedIds.map((id, index) => prisma.partner.update({ where: { id }, data: { position: index } }))
    );

    revalidatePath("/admin/parceiros");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    console.error("[reorderPartners]", err);
    return { success: false, error: "Erro ao reordenar parceiros" };
  }
}

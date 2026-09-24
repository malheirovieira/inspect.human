"use server";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

export type NotificationDTO = {
  id: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
};

// Sino do topo: usado em toda página do dashboard (via Header), então não dá
// pra usar requireRole aqui — um EMPLOYEE cairia no redirect dela em vez de
// só ver o sino sem dados. Em vez disso, quem não é ADMIN/HR simplesmente
// recebe uma lista vazia (mesma técnica do /dashboard: degradar, não redirecionar).
async function companyIdForNotifications(): Promise<string | null> {
  const session = await requireSession();
  if (session.role !== "ADMIN" && session.role !== "HR") return null;
  return session.companyId;
}

export async function listNotifications(): Promise<{ items: NotificationDTO[]; unreadCount: number }> {
  const companyId = await companyIdForNotifications();
  if (!companyId) return { items: [], unreadCount: 0 };

  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.notification.count({ where: { companyId, read: false } }),
  ]);

  return {
    items: items.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      link: n.link,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
    })),
    unreadCount,
  };
}

export async function markNotificationRead(id: string): Promise<void> {
  const companyId = await companyIdForNotifications();
  if (!companyId) return;
  await prisma.notification.updateMany({ where: { id, companyId }, data: { read: true } });
}

export async function markAllNotificationsRead(): Promise<void> {
  const companyId = await companyIdForNotifications();
  if (!companyId) return;
  await prisma.notification.updateMany({ where: { companyId, read: false }, data: { read: true } });
}

export async function clearNotifications(): Promise<void> {
  const companyId = await companyIdForNotifications();
  if (!companyId) return;
  await prisma.notification.deleteMany({ where: { companyId } });
}

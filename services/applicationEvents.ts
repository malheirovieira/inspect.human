import "server-only";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import type { Prisma } from "@prisma/client";

// Registro append-only do histórico de uma candidatura — mudança de etapa,
// nota, tag, candidatura criada (Fase 0) e, na Fase 1, envio de e-mail.
// actorId null = evento gerado pelo sistema (ex.: candidatura pública, sem
// sessão), não por uma ação de um usuário logado.
export async function logApplicationEvent(params: {
  companyId: string;
  applicationId: string;
  type: string;
  payload?: Prisma.InputJsonValue;
  actorId?: string | null;
}) {
  await prisma.applicationEvent.create({
    data: {
      companyId: params.companyId,
      applicationId: params.applicationId,
      type: params.type,
      payload: params.payload,
      actorId: params.actorId ?? null,
    },
  });
}

export async function listApplicationEvents(applicationId: string) {
  const session = await requireRole(["ADMIN", "HR"]);
  return prisma.applicationEvent.findMany({
    where: { applicationId, companyId: session.companyId },
    orderBy: { createdAt: "desc" },
    include: { actor: { select: { name: true } } },
  });
}

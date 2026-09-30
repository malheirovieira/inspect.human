import "server-only";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

// A CANDIDATURA — usada no cabeçalho/checklist/timeline da página de
// detalhe (/recrutamento/vagas/[jobId]/candidaturas/[applicationId]).
export async function getApplication(applicationId: string) {
  const session = await requireRole(["ADMIN", "HR"]);
  return prisma.application.findFirst({
    where: { id: applicationId, companyId: session.companyId },
    include: {
      candidate: { select: { id: true, name: true, email: true, phone: true, linkedinUrl: true } },
      job: { select: { id: true, title: true } },
      interviews: { orderBy: { createdAt: "desc" } },
      discResponses: { orderBy: { createdAt: "desc" }, include: { assessment: { select: { title: true } } } },
      quizResponses: { orderBy: { createdAt: "desc" }, include: { assessment: { select: { title: true, scored: true } } } },
    },
  });
}

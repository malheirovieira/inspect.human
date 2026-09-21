import "server-only";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

export type CandidateFilters = { q?: string; stage?: string; tag?: string; jobId?: string };

export async function listCandidates(filters: CandidateFilters = {}) {
  const session = await requireRole(["ADMIN", "HR"]);
  const { q, stage, tag, jobId } = filters;

  return prisma.candidate.findMany({
    where: {
      companyId: session.companyId,
      ...(jobId ? { jobId } : {}),
      ...(stage ? { stage } : {}),
      ...(tag ? { qualificationTag: tag } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { job: { select: { title: true } } },
  });
}

export async function getCandidate(candidateId: string) {
  const session = await requireRole(["ADMIN", "HR"]);
  return prisma.candidate.findFirst({
    where: { id: candidateId, companyId: session.companyId },
    include: { job: { select: { title: true } } },
  });
}

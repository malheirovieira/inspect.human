import "server-only";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

export type CandidateFilters = { q?: string; stage?: string; tag?: string; jobId?: string };

// Uma linha por Application (candidatura), com os dados da pessoa
// embutidos — usado na lista do Banco de Talentos e nos boards
// (Kanban/lista) dentro de uma vaga. `id` é o id da Application;
// `candidateId` é o id da pessoa (Candidate) de verdade, usado pra linkar
// pro perfil dela a partir do Banco de Talentos.
function flattenApplication<
  T extends {
    id: string;
    candidateId: string;
    jobId: string;
    stage: string;
    position: number;
    qualificationTag: string | null;
    hiredAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    candidate: { name: string; email: string; phone: string | null; linkedinUrl: string | null; resumePath: string | null };
    job: { title: string };
  },
>(app: T) {
  const { candidate, ...rest } = app;
  return { ...rest, ...candidate };
}

export async function listCandidates(filters: CandidateFilters = {}) {
  const session = await requireRole(["ADMIN", "HR"]);
  const { q, stage, tag, jobId } = filters;

  const applications = await prisma.application.findMany({
    where: {
      companyId: session.companyId,
      ...(jobId ? { jobId } : {}),
      ...(stage ? { stage } : {}),
      ...(tag ? { qualificationTag: tag } : {}),
      ...(q
        ? {
            candidate: {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
              ],
            },
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      candidate: { select: { name: true, email: true, phone: true, linkedinUrl: true, resumePath: true } },
      job: { select: { title: true } },
    },
  });

  return applications.map(flattenApplication);
}

// A PESSOA (perfil no Banco de Talentos) — dados de contato + currículo +
// a lista de todas as candidaturas dela (aba "Candidaturas").
export async function getPerson(candidateId: string) {
  const session = await requireRole(["ADMIN", "HR"]);
  const candidate = await prisma.candidate.findFirst({
    where: { id: candidateId, companyId: session.companyId },
    include: {
      applications: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          jobId: true,
          stage: true,
          hiredAt: true,
          createdAt: true,
          job: { select: { title: true } },
        },
      },
    },
  });
  return candidate;
}

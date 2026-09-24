import "server-only";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

import { getAiSnippets, getCandidateIdsWithSkill } from "./resumeAnalyses";

// tag = tag de TRIAGEM (qualificationTag); skill = tag de COMPETÊNCIA do
// resumo por IA — nomes diferentes de propósito.
export type CandidateFilters = { q?: string; stage?: string; tag?: string; jobId?: string; skill?: string };

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
    candidate: {
      name: string;
      email: string;
      phone: string | null;
      linkedinUrl: string | null;
      currentResumeId: string | null;
      isTest: boolean;
    };
    job: { title: string };
  },
>(app: T) {
  const { candidate, ...rest } = app;
  return { ...rest, ...candidate };
}

export async function listCandidates(filters: CandidateFilters = {}) {
  const session = await requireRole(["ADMIN", "HR"]);
  const { q, stage, tag, jobId, skill } = filters;

  const skillCandidateIds = skill ? await getCandidateIdsWithSkill(session.companyId, skill) : null;

  const applications = await prisma.application.findMany({
    where: {
      companyId: session.companyId,
      ...(skillCandidateIds ? { candidateId: { in: skillCandidateIds } } : {}),
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
      candidate: { select: { name: true, email: true, phone: true, linkedinUrl: true, currentResumeId: true, isTest: true } },
      job: { select: { title: true } },
    },
  });

  const snippets = await getAiSnippets(session.companyId, [...new Set(applications.map((a) => a.candidateId))]);
  return applications.map((a) => {
    const snippet = snippets.get(a.candidateId);
    return { ...flattenApplication(a), aiSkills: snippet?.skills, aiExperienceYears: snippet?.experienceYears ?? null };
  });
}

// A PESSOA (perfil no Banco de Talentos) — dados de contato + currículo
// (versão atual + anteriores) + a lista de todas as candidaturas dela (aba
// "Candidaturas").
export async function getPerson(candidateId: string) {
  const session = await requireRole(["ADMIN", "HR"]);
  const candidate = await prisma.candidate.findFirst({
    where: { id: candidateId, companyId: session.companyId },
    include: {
      resumes: {
        orderBy: { createdAt: "desc" },
        select: { id: true, storagePath: true, source: true, sizeBytes: true, createdAt: true },
      },
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

import "server-only";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

export type JobFilters = { q?: string; status?: string };

export async function listJobs(filters: JobFilters = {}) {
  const session = await requireRole(["ADMIN", "HR"]);
  const { q, status } = filters;

  return prisma.job.findMany({
    where: {
      companyId: session.companyId,
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { location: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { applications: true } },
      // Só pra saber se a vaga tem alguém contratado (tag "Vaga Preenchida"
      // na listagem) — não é a lista de candidatos da vaga, por isso o
      // select mínimo e o take: 1.
      applications: { where: { stage: "HIRED" }, select: { id: true }, take: 1 },
    },
  });
}

export async function getJob(jobId: string) {
  const session = await requireRole(["ADMIN", "HR"]);
  return prisma.job.findFirst({
    where: { id: jobId, companyId: session.companyId },
    include: {
      applications: {
        orderBy: { createdAt: "desc" },
        include: {
          candidate: { select: { name: true, email: true, phone: true, linkedinUrl: true, resumePath: true } },
        },
      },
      createdBy: { select: { name: true } },
    },
  });
}

// ---- Leituras públicas (página de vagas da empresa) — sem sessão, sempre
// filtradas por status = OPEN. Nunca expor DRAFT/CLOSED aqui.
export async function listPublicOpenJobs(companySlug: string) {
  const company = await prisma.company.findUnique({ where: { slug: companySlug, active: true } });
  if (!company) return null;
  const jobs = await prisma.job.findMany({
    where: { companyId: company.id, status: "OPEN" },
    orderBy: { createdAt: "desc" },
  });
  return { company, jobs };
}

export async function getPublicOpenJob(companySlug: string, jobId: string) {
  const company = await prisma.company.findUnique({ where: { slug: companySlug, active: true } });
  if (!company) return null;
  const job = await prisma.job.findFirst({ where: { id: jobId, companyId: company.id, status: "OPEN" } });
  if (!job) return null;
  return { company, job };
}

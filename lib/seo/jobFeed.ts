import "server-only";
import { prisma } from "@/lib/prisma";

export type FeedJob = {
  id: string;
  title: string;
  description: string;
  location: string | null;
  workMode: string;
  employmentType: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  validThrough: Date | null;
};

export type FeedCompany = {
  name: string;
  slug: string;
  addressCity: string | null;
  addressState: string | null;
  addressZip: string | null;
  addressCountry: string | null;
};

// Mesma checagem de "vaga pública" usada em services/jobs.ts
// (getPublicOpenJob/getPublicOpenJobs) — só status OPEN de empresa ativa.
export async function listFeedJobs(companySlug: string): Promise<{ company: FeedCompany; jobs: FeedJob[] } | null> {
  const company = await prisma.company.findUnique({
    where: { slug: companySlug, active: true },
    select: { id: true, name: true, slug: true, addressCity: true, addressState: true, addressZip: true, addressCountry: true },
  });
  if (!company) return null;

  const jobs = await prisma.job.findMany({
    where: { companyId: company.id, status: "OPEN" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      location: true,
      workMode: true,
      employmentType: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
      validThrough: true,
    },
  });

  return { company, jobs };
}

// CDATA quebra se o conteúdo tiver literalmente "]]>" — divide em duas
// seções CDATA nesse ponto (truque padrão, ver W3C), senão o parser do
// agregador vê isso como o FIM da seção no meio do texto.
export function cdata(value: string): string {
  return `<![CDATA[${value.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}

export function jobUrl(baseUrl: string, companySlug: string, jobId: string): string {
  return `${baseUrl}/empresa/${companySlug}/vagas/${jobId}`;
}

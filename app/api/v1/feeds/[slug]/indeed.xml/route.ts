import { NextResponse } from "next/server";
import { listFeedJobs, cdata, jobUrl } from "@/lib/seo/jobFeed";

// Feed Indeed (Job Sync XML) — especificação oficial em
// https://docs.indeed.com/job-sync-xml/xml-feed. Raiz <source>, cada vaga em
// <job>. Tudo em CDATA; <date> em ISO-8601; remoto usa <remotetype> com
// city/postalcode vazios (ver seção "Remote Job Representation" da doc).
export const revalidate = 300; // cache leve de 5min — não precisa ser tempo real

const EMPLOYMENT_TYPE_MAP: Record<string, string> = {
  clt: "fulltime",
  efetivo: "fulltime",
  permanente: "fulltime",
  pj: "contract",
  freelancer: "contract",
  autonomo: "contract",
  estagio: "internship",
  temporario: "temporary",
  "meio periodo": "parttime",
};

function mapJobType(value: string | null): string | null {
  if (!value) return null;
  const normalized = value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
  return EMPLOYMENT_TYPE_MAP[normalized] ?? null;
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = await listFeedJobs(slug, "indeed");
  if (!found) return new NextResponse("Empresa não encontrada", { status: 404 });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const { company, jobs } = found;
  const isRemoteCompany = !company.addressCity;

  const jobsXml = jobs
    .map((job) => {
      const remote = job.workMode === "REMOTO";
      const jobType = mapJobType(job.employmentType);

      const lines = [
        `    <title>${cdata(job.title)}</title>`,
        `    <date>${(job.publishedAt ?? job.createdAt).toISOString()}</date>`,
        `    <referencenumber>${cdata(job.id)}</referencenumber>`,
        `    <requisitionid>${cdata(job.id)}</requisitionid>`,
        `    <url>${cdata(jobUrl(baseUrl, company.slug, job.id))}</url>`,
        `    <company>${cdata(company.name)}</company>`,
        `    <city>${cdata(remote ? "" : job.location || company.addressCity || "")}</city>`,
        `    <state>${cdata(company.addressState || "")}</state>`,
        `    <country>${cdata(company.addressCountry || "BR")}</country>`,
        `    <postalcode>${cdata(remote ? "" : company.addressZip || "")}</postalcode>`,
        `    <description>${cdata(job.description)}</description>`,
        jobType ? `    <jobtype>${cdata(jobType)}</jobtype>` : null,
        remote ? `    <remotetype>${cdata(isRemoteCompany ? "Fully remote" : "Hybrid remote")}</remotetype>` : null,
        job.validThrough ? `    <expirationdate>${job.validThrough.toISOString()}</expirationdate>` : null,
      ].filter((line): line is string => line !== null);

      return `  <job>\n${lines.join("\n")}\n  </job>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="utf-8"?>\n<source>\n  <publisher>Inspect Talent</publisher>\n  <publisherurl>${baseUrl}</publisherurl>\n${jobsXml}\n</source>\n`;

  return new NextResponse(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}

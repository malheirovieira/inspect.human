import { NextResponse } from "next/server";
import { listFeedJobs, cdata, jobUrl } from "@/lib/seo/jobFeed";

// Feed Jooble (formato próprio, não RSS) — especificação oficial em
// https://jooble.org/files/xml_feed_specifications.pdf (JoobleBot crawleia
// a cada 24h; só indexa vaga publicada há menos de 45 dias da 1ª visita ao
// feed). Raiz <jobs>, cada vaga em <job id="...">. Obrigatórios: url, name,
// region, description — tudo em CDATA. pubdate/updated em DD.MM.YYYY.
export const revalidate = 300; // cache leve de 5min — não precisa ser tempo real

function formatJoobleDate(date: Date): string {
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${date.getUTCFullYear()}`;
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = await listFeedJobs(slug, "jooble");
  if (!found) return new NextResponse("Empresa não encontrada", { status: 404 });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const { company, jobs } = found;

  const region = [company.addressCity, company.addressState].filter(Boolean).join(", ") || "Brasil";

  const jobsXml = jobs
    .map(
      (job) => `  <job id="${job.id}">
    <url>${cdata(jobUrl(baseUrl, company.slug, job.id))}</url>
    <name>${cdata(job.title)}</name>
    <region>${cdata(job.location || region)}</region>
    <description>${cdata(job.description)}</description>
    <company>${cdata(company.name)}</company>
    <pubdate>${formatJoobleDate(job.publishedAt ?? job.createdAt)}</pubdate>
    <updated>${formatJoobleDate(job.updatedAt)}</updated>
  </job>`
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<jobs>\n${jobsXml}\n</jobs>\n`;

  return new NextResponse(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}

import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { ApplyForm } from "@/components/recrutamento/ApplyForm";
import { getPublicOpenJob } from "@/services/jobs";

const WORK_MODE_LABEL: Record<string, string> = {
  PRESENCIAL: "Presencial",
  REMOTO: "Remoto",
  HIBRIDO: "Híbrido",
};

export default async function VagaPublicaPage({ params }: { params: Promise<{ slug: string; jobId: string }> }) {
  const { slug, jobId } = await params;
  const found = await getPublicOpenJob(slug, jobId);
  if (!found) notFound();

  return (
    <div style={{ minHeight: "100vh", background: "var(--surface-page)", padding: "48px 24px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
        <span className="brand-wordmark">{found.company.name}</span>

        <Card style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span className="fin-eyebrow">{WORK_MODE_LABEL[found.job.workMode] ?? found.job.workMode}</span>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{found.job.title}</h1>
          {found.job.location && <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{found.job.location}</span>}
          <p style={{ whiteSpace: "pre-wrap", fontSize: 14, color: "var(--text-secondary)", marginTop: 12 }}>
            {found.job.description}
          </p>
        </Card>

        <ApplyForm companySlug={slug} jobId={found.job.id} />
      </div>
    </div>
  );
}

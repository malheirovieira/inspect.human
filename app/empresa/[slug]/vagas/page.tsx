import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { Card } from "@/components/ui/Card";
import { listPublicOpenJobs } from "@/services/jobs";

const WORK_MODE_LABEL: Record<string, string> = {
  PRESENCIAL: "Presencial",
  REMOTO: "Remoto",
  HIBRIDO: "Híbrido",
};

export default async function VagasPublicasPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = await listPublicOpenJobs(slug);
  if (!found) notFound();

  return (
    <div style={{ minHeight: "100vh", background: "var(--surface-page)", padding: "48px 24px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
        <Logo />
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0 }}>Vagas em {found.company.name}</h1>
          <p style={{ color: "var(--text-muted)", marginTop: 4 }}>
            {found.jobs.length} vaga(s) aberta(s) no momento.
          </p>
        </div>

        {found.jobs.length === 0 ? (
          <Card>
            <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)" }}>
              Nenhuma vaga aberta no momento. Volte em breve.
            </p>
          </Card>
        ) : (
          found.jobs.map((job) => (
            <Link key={job.id} href={`/empresa/${slug}/vagas/${job.id}`} style={{ textDecoration: "none", color: "inherit" }}>
              <Card style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span className="fin-eyebrow">{WORK_MODE_LABEL[job.workMode] ?? job.workMode}</span>
                <div className="fin-heading" style={{ marginBottom: 0, fontSize: 17 }}>
                  {job.title}
                </div>
                {job.location && <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{job.location}</span>}
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { VagasToolbar } from "@/components/recrutamento/VagasToolbar";
import { Briefcase } from "lucide-react";
import { listJobs } from "@/services/jobs";
import { listCompanyOptions } from "@/services/companyOptions";
import { JOB_STATUSES } from "@/schemas/job";
import { getJobBoardAvailability } from "@/lib/config/jobBoards";
import { getCompany } from "@/services/company";
import { requireRole } from "@/lib/session";
import Link from "next/link";

const STATUS_LABEL: Record<(typeof JOB_STATUSES)[number], string> = {
  DRAFT: "Rascunho",
  OPEN: "Aberta",
  CLOSED: "Fechada",
};

function jobBadge(job: { status: string; applications: { id: string }[] }): { label: string; tone: "success" | "primary" | "danger" } {
  if (job.applications.length > 0) return { label: "Vaga Preenchida", tone: "success" };
  if (job.status === "CLOSED") return { label: "Vaga não preenchida", tone: "danger" };
  return { label: STATUS_LABEL[job.status as keyof typeof STATUS_LABEL], tone: job.status === "OPEN" ? "success" : "primary" };
}

export default async function VagasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;
  const session = await requireRole(["ADMIN", "HR"]);
  const [jobs, employmentTypes, departments, company] = await Promise.all([
    listJobs({ q, status }),
    listCompanyOptions("MODALIDADE_CONTRATACAO"),
    listCompanyOptions("SETOR"),
    getCompany(session.companyId),
  ]);
  const jobBoards = getJobBoardAvailability({
    indeedEmployerEmail: company?.indeedEmployerEmail ?? null,
    linkedinCompanyId: company?.linkedinCompanyId ?? null,
    infojobsId: company?.infojobsId ?? null,
  });
  const hasFilters = Boolean(q || status);

  return (
    <>
      <Header eyebrow="RECRUTAMENTO" title="Vagas" />
      <div className="fin-content">
        <VagasToolbar
          employmentTypeOptions={employmentTypes.map((o) => o.label)}
          departmentOptions={departments.map((o) => o.label)}
          jobBoards={jobBoards}
        />

        {jobs.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title={hasFilters ? "Nenhum resultado encontrado" : "Nenhuma vaga cadastrada"}
            description={
              hasFilters
                ? "Ajuste a busca ou os filtros para ver outras vagas."
                : "Crie a primeira vaga para começar a receber candidaturas."
            }
          />
        ) : (
          <Card style={{ padding: 0 }}>
            {jobs.map((job, index) => (
              <Link
                key={job.id}
                href={`/recrutamento/vagas/${job.id}`}
                className="fin-list-row"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 24px",
                  borderTop: index === 0 ? "none" : "1px solid var(--border)",
                  color: "inherit",
                  textDecoration: "none",
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{job.title}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                    {job.location || "Local não informado"} · {job._count.applications} candidato(s)
                  </div>
                </div>
                <Badge tone={jobBadge(job).tone}>{jobBadge(job).label}</Badge>
              </Link>
            ))}
          </Card>
        )}
      </div>
    </>
  );
}

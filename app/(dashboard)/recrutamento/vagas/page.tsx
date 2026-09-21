import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListToolbar } from "@/components/ui/ListToolbar";
import { NewJobToggle } from "@/components/recrutamento/NewJobToggle";
import { JobForm } from "@/components/recrutamento/JobForm";
import { Briefcase } from "lucide-react";
import { listJobs } from "@/services/jobs";
import { listCompanyOptions } from "@/services/companyOptions";
import { JOB_STATUSES } from "@/schemas/job";
import Link from "next/link";

const STATUS_LABEL: Record<(typeof JOB_STATUSES)[number], string> = {
  DRAFT: "Rascunho",
  OPEN: "Aberta",
  CLOSED: "Fechada",
};

export default async function VagasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;
  const [jobs, employmentTypes, departments] = await Promise.all([
    listJobs({ q, status }),
    listCompanyOptions("MODALIDADE_CONTRATACAO"),
    listCompanyOptions("SETOR"),
  ]);
  const hasFilters = Boolean(q || status);

  return (
    <>
      <Header eyebrow="RECRUTAMENTO" title="Vagas" />
      <div className="fin-content">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <ListToolbar
            searchPlaceholder="Buscar por título ou local..."
            filters={[
              {
                key: "status",
                label: "Todos os status",
                options: [
                  { value: "OPEN", label: "Aberta" },
                  { value: "DRAFT", label: "Rascunho" },
                  { value: "CLOSED", label: "Fechada" },
                ],
              },
            ]}
          />
          <NewJobToggle>
            <JobForm
              employmentTypeOptions={employmentTypes.map((o) => o.label)}
              departmentOptions={departments.map((o) => o.label)}
            />
          </NewJobToggle>
        </div>

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
                    {job.location || "Local não informado"} · {job._count.candidates} candidato(s)
                  </div>
                </div>
                <Badge tone={job.status === "OPEN" ? "success" : "primary"}>{STATUS_LABEL[job.status as keyof typeof STATUS_LABEL]}</Badge>
              </Link>
            ))}
          </Card>
        )}
      </div>
    </>
  );
}

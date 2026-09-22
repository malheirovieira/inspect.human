import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { JobForm } from "@/components/recrutamento/JobForm";
import { CopyLinkButton } from "@/components/recrutamento/CopyLinkButton";
import { JobDeleteButton } from "@/components/recrutamento/JobDeleteButton";
import { CandidatesBoard } from "@/components/recrutamento/CandidatesBoard";
import { KanbanBoard } from "@/components/recrutamento/KanbanBoard";
import { getJob } from "@/services/jobs";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { setJobStatus } from "@/app/(dashboard)/recrutamento/vagas/actions";
import { listCompanyOptions } from "@/services/companyOptions";
import { getKanbanStageLabels } from "@/services/kanbanLabels";

const TABS = [
  { key: "detalhes", label: "Detalhes" },
  { key: "candidatos", label: "Candidatos" },
] as const;

export default async function VagaDetalhePage({
  params,
  searchParams,
}: {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<{ tab?: string; view?: string }>;
}) {
  const { jobId } = await params;
  const { tab, view } = await searchParams;
  const activeTab = TABS.some((t) => t.key === tab) ? tab! : "detalhes";
  const isKanban = view === "kanban";

  const session = await requireSession();
  const [job, company, employmentTypes, departments, stageLabels] = await Promise.all([
    getJob(jobId),
    prisma.company.findUnique({ where: { id: session.companyId } }),
    listCompanyOptions("MODALIDADE_CONTRATACAO"),
    listCompanyOptions("SETOR"),
    getKanbanStageLabels(),
  ]);

  if (!job) notFound();

  const publicPath = `/empresa/${company?.slug}/vagas/${job.id}`;
  const boardCandidates = job.candidates.map((c) => ({ ...c, job: { title: job.title } }));

  return (
    <>
      <Header
        title={job.title}
        backHref="/recrutamento/vagas"
        breadcrumb={[
          { label: "Recrutamento" },
          { label: "Vagas", href: "/recrutamento/vagas" },
          { label: job.title },
        ]}
      />
      <div className="fin-content">
        <Card style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Badge tone={job.status === "OPEN" ? "success" : "primary"}>
              {job.status === "OPEN" ? "Aberta" : job.status === "CLOSED" ? "Fechada" : "Rascunho"}
            </Badge>
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
              {job.candidates.length} candidato(s) recebido(s)
              {job.department ? ` · ${job.department}` : ""}
              {job.createdBy ? ` · Criada por ${job.createdBy.name}` : ""}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {job.status === "OPEN" && company && <CopyLinkButton path={publicPath} />}
            {job.status !== "OPEN" && (
              <form
                action={async () => {
                  "use server";
                  await setJobStatus(job.id, "OPEN");
                }}
              >
                <Button type="submit" variant="secondary">
                  Publicar vaga
                </Button>
              </form>
            )}
            {job.status === "CLOSED" && <JobDeleteButton jobId={job.id} title={job.title} />}
            {job.status !== "CLOSED" && (
              <form
                action={async () => {
                  "use server";
                  await setJobStatus(job.id, "CLOSED");
                }}
              >
                <Button type="submit" variant="secondary">
                  Encerrar vaga
                </Button>
              </form>
            )}
          </div>
        </Card>

        <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border)" }}>
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/recrutamento/vagas/${jobId}?tab=${t.key}`}
              style={{
                padding: "10px 16px",
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
                color: activeTab === t.key ? "var(--action-primary-text)" : "var(--text-muted)",
                borderBottom: activeTab === t.key ? "2px solid var(--action-primary)" : "2px solid transparent",
              }}
            >
              {t.label}
              {t.key === "candidatos" ? ` (${job.candidates.length})` : ""}
            </Link>
          ))}
        </div>

        {activeTab === "detalhes" && (
          <JobForm
            jobId={job.id}
            initial={{
              title: job.title,
              description: job.description,
              department: job.department ?? "",
              location: job.location ?? "",
              workMode: job.workMode as "PRESENCIAL" | "REMOTO" | "HIBRIDO",
              employmentType: job.employmentType ?? "",
            }}
            employmentTypeOptions={employmentTypes.map((o) => o.label)}
            departmentOptions={departments.map((o) => o.label)}
          />
        )}

        {activeTab === "candidatos" && (
          <>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Link href={`/recrutamento/vagas/${jobId}?tab=candidatos`}>
                <Button variant={isKanban ? "secondary" : "primary"}>Lista</Button>
              </Link>
              <Link href={`/recrutamento/vagas/${jobId}?tab=candidatos&view=kanban`}>
                <Button variant={isKanban ? "primary" : "secondary"}>Kanban</Button>
              </Link>
            </div>
            {isKanban ? (
              <KanbanBoard candidates={boardCandidates} stageLabels={stageLabels} showJob={false} />
            ) : (
              <CandidatesBoard
                candidates={boardCandidates}
                showJob={false}
                emptyTitle="Nenhuma candidatura recebida ainda"
                emptyDescription="Candidaturas enviadas pelo link público desta vaga aparecem aqui."
              />
            )}
          </>
        )}
      </div>
    </>
  );
}

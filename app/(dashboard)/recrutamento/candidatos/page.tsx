import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { ListToolbar } from "@/components/ui/ListToolbar";
import { CandidatesBoard } from "@/components/recrutamento/CandidatesBoard";
import { KanbanBoard } from "@/components/recrutamento/KanbanBoard";
import { NewCandidateToggle } from "@/components/recrutamento/NewCandidateToggle";
import { CandidateManualForm } from "@/components/recrutamento/CandidateManualForm";
import { listCandidates } from "@/services/candidates";
import { getKanbanStageLabels } from "@/services/kanbanLabels";
import { listJobs } from "@/services/jobs";
import { CANDIDATE_STAGES, STAGE_LABELS, CANDIDATE_TAGS, TAG_LABELS } from "@/schemas/candidate";

export default async function CandidatosPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; q?: string; stage?: string; tag?: string }>;
}) {
  const { view, q, stage, tag } = await searchParams;
  const isKanban = view === "kanban";
  const [candidates, stageLabels, jobs] = await Promise.all([
    listCandidates({ q, stage, tag }),
    getKanbanStageLabels(),
    listJobs(),
  ]);
  const hasFilters = Boolean(q || stage || tag);

  const baseQuery: Record<string, string> = {};
  if (q) baseQuery.q = q;
  if (stage) baseQuery.stage = stage;
  if (tag) baseQuery.tag = tag;

  return (
    <>
      <Header eyebrow="RECRUTAMENTO" title="Candidatos" />
      <div className="fin-content">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <ListToolbar
            searchPlaceholder="Buscar por nome ou e-mail..."
            filters={[
              {
                key: "stage",
                label: "Todas as etapas",
                options: CANDIDATE_STAGES.map((s) => ({ value: s, label: STAGE_LABELS[s] })),
              },
              {
                key: "tag",
                label: "Todas as tags",
                options: CANDIDATE_TAGS.map((t) => ({ value: t, label: TAG_LABELS[t] })),
              },
            ]}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <Link href={{ pathname: "/recrutamento/candidatos", query: baseQuery }}>
              <Button variant={isKanban ? "secondary" : "primary"}>Lista</Button>
            </Link>
            <Link href={{ pathname: "/recrutamento/candidatos", query: { ...baseQuery, view: "kanban" } }}>
              <Button variant={isKanban ? "primary" : "secondary"}>Kanban</Button>
            </Link>
            <NewCandidateToggle>
              <CandidateManualForm jobs={jobs.map((j) => ({ id: j.id, title: j.title }))} />
            </NewCandidateToggle>
          </div>
        </div>

        {isKanban ? (
          <KanbanBoard candidates={candidates} stageLabels={stageLabels} />
        ) : (
          <CandidatesBoard
            candidates={candidates}
            emptyTitle={hasFilters ? "Nenhum resultado encontrado" : "Nenhum candidato ainda"}
            emptyDescription={
              hasFilters
                ? "Ajuste a busca ou os filtros para ver outros candidatos."
                : "Candidaturas recebidas pelo link público das vagas aparecem aqui."
            }
          />
        )}
      </div>
    </>
  );
}

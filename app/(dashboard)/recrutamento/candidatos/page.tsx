import { Header } from "@/components/layout/Header";
import { CandidatesBoard } from "@/components/recrutamento/CandidatesBoard";
import { KanbanBoard } from "@/components/recrutamento/KanbanBoard";
import { CandidatesToolbar } from "@/components/recrutamento/CandidatesToolbar";
import { listCandidates } from "@/services/candidates";
import { getKanbanStageLabels } from "@/services/kanbanLabels";
import { listJobs } from "@/services/jobs";
import { CANDIDATE_STAGES, CANDIDATE_TAGS, TAG_LABELS } from "@/schemas/candidate";

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
        <CandidatesToolbar
          isKanban={isKanban}
          baseQuery={baseQuery}
          stageOptions={CANDIDATE_STAGES.map((s) => ({ value: s, label: stageLabels[s] }))}
          tagOptions={CANDIDATE_TAGS.map((t) => ({ value: t, label: TAG_LABELS[t] }))}
          jobs={jobs.map((j) => ({ id: j.id, title: j.title }))}
        />

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

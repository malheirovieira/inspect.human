import { Header } from "@/components/layout/Header";
import { CandidatesBoard } from "@/components/recrutamento/CandidatesBoard";
import { CandidatesToolbar } from "@/components/recrutamento/CandidatesToolbar";
import { listCandidates } from "@/services/candidates";
import { listJobs } from "@/services/jobs";
import { getKanbanStageLabels } from "@/services/kanbanLabels";
import { CANDIDATE_STAGES, CANDIDATE_TAGS, TAG_LABELS } from "@/schemas/candidate";

// "Banco de Talentos" — lista de pessoas (Candidate), sem Kanban: o board
// arrastável é o pipeline de UMA vaga específica, dentro dela
// (/recrutamento/vagas/[jobId]?tab=candidatos). Aqui o foco é busca e
// histórico entre candidaturas.
export default async function BancoDeTalentosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; stage?: string; tag?: string; jobId?: string }>;
}) {
  const { q, stage, tag, jobId } = await searchParams;
  const [candidates, jobs, stageLabels] = await Promise.all([
    listCandidates({ q, stage, tag, jobId }),
    listJobs(),
    getKanbanStageLabels(),
  ]);
  const hasFilters = Boolean(q || stage || tag || jobId);

  return (
    <>
      <Header eyebrow="RECRUTAMENTO" title="Banco de Talentos" subtitle="Busca e histórico de candidatos" />
      <div className="fin-content">
        <CandidatesToolbar
          stageOptions={CANDIDATE_STAGES.map((s) => ({ value: s, label: stageLabels[s] }))}
          jobOptions={jobs.map((j) => ({ value: j.id, label: j.title }))}
          tagOptions={CANDIDATE_TAGS.map((t) => ({ value: t, label: TAG_LABELS[t] }))}
          jobs={jobs.map((j) => ({ id: j.id, title: j.title }))}
        />

        <CandidatesBoard
          candidates={candidates}
          emptyTitle={hasFilters ? "Nenhum resultado encontrado" : "Nenhum candidato ainda"}
          emptyDescription={
            hasFilters
              ? "Ajuste a busca ou os filtros para ver outros candidatos."
              : "Candidaturas recebidas pelo link público das vagas aparecem aqui."
          }
        />
      </div>
    </>
  );
}

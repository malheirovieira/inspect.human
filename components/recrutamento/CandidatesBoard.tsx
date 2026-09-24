import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { TagDot } from "@/components/recrutamento/TagDot";
import { AiCardSnippet } from "@/components/recrutamento/AiCardSnippet";
import { UserSearch } from "lucide-react";
import { STAGE_LABELS, type CANDIDATE_TAGS } from "@/schemas/candidate";

export type BoardCandidate = {
  id: string;
  candidateId: string;
  name: string;
  email: string;
  stage: string;
  qualificationTag: string | null;
  position: number;
  job: { title: string };
  isTest?: boolean;
  aiSkills?: string[];
  aiExperienceYears?: number | null;
};

// Visão em lista dos candidatos. O Kanban (com drag-and-drop) é o
// KanbanBoard, um componente client à parte — ver components/recrutamento/KanbanBoard.tsx.
//
// `jobId` presente = lista dentro de UMA vaga (aba Candidatos) — cada linha
// linka pra candidatura. Ausente = Banco de Talentos (lista geral) — cada
// linha linka pro perfil da pessoa.
export function CandidatesBoard({
  candidates,
  jobId,
  showJob = true,
  emptyTitle = "Nenhum candidato ainda",
  emptyDescription = "Candidaturas recebidas pelo link público das vagas aparecem aqui.",
}: {
  candidates: BoardCandidate[];
  jobId?: string;
  showJob?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (candidates.length === 0) {
    return <EmptyState icon={UserSearch} title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <Card style={{ padding: 0 }}>
      {candidates.map((candidate, index) => (
        <Link
          key={candidate.id}
          href={
            jobId
              ? `/recrutamento/vagas/${jobId}/candidaturas/${candidate.id}`
              : `/recrutamento/banco-de-talentos/${candidate.candidateId}`
          }
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
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600 }}>
              {candidate.name}
              {candidate.isTest && <Badge tone="primary">Teste</Badge>}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              {showJob ? `${candidate.job.title} · ` : ""}
              {candidate.email}
            </div>
            <AiCardSnippet skills={candidate.aiSkills} experienceYears={candidate.aiExperienceYears} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {candidate.qualificationTag && candidate.stage === "TRIAGE" && (
              <TagDot tag={candidate.qualificationTag as (typeof CANDIDATE_TAGS)[number]} />
            )}
            <Badge tone="primary">{STAGE_LABELS[candidate.stage as keyof typeof STAGE_LABELS]}</Badge>
          </div>
        </Link>
      ))}
    </Card>
  );
}

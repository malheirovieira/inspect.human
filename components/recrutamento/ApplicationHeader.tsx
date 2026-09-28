"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Field";
import { setCandidateTag } from "@/app/(dashboard)/recrutamento/banco-de-talentos/actions";
import { DeleteCandidateButton } from "@/components/recrutamento/DeleteCandidateButton";
import { CANDIDATE_STAGES, STAGE_LABELS, CANDIDATE_TAGS, TAG_LABELS, TAG_COLORS, TAG_NEXT_STEP } from "@/schemas/candidate";

type Stage = (typeof CANDIDATE_STAGES)[number];
type Tag = (typeof CANDIDATE_TAGS)[number];

// Cabeçalho da candidatura: nome (com link pro perfil da pessoa), vaga,
// etapa atual e tag de triagem — editáveis aqui, mesma action que o
// Kanban/checklist usam (sincronização automática).
export function ApplicationHeader({
  applicationId,
  candidateId,
  candidateName,
  jobTitle,
  jobId,
  stage,
  tag,
  stageLabels,
}: {
  applicationId: string;
  candidateId: string;
  candidateName: string;
  jobTitle: string;
  jobId: string;
  stage: Stage;
  tag: Tag | null;
  stageLabels: Record<Stage, string>;
}) {
  const router = useRouter();
  const [currentStage, setCurrentStage] = useState(stage);
  const [currentTag, setCurrentTag] = useState<Tag | "">(tag ?? "");

  async function handleTagChange(next: Tag | "") {
    setCurrentTag(next);
    // A action já reprova a candidatura sozinha quando a tag é "Perfil
    // incompatível" (atômico, ver setCandidateTag) — só reflete o
    // resultado aqui, sem precisar de uma segunda chamada.
    const result = await setCandidateTag(applicationId, next || null);
    if ("stage" in result) setCurrentStage(result.stage);
    router.refresh();
  }

  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)" }}>{candidateName}</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>{jobTitle}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href={`/recrutamento/banco-de-talentos/${candidateId}`} style={{ fontSize: 13, fontWeight: 500 }}>
            Ver perfil completo
          </Link>
          <DeleteCandidateButton candidateId={candidateId} candidateName={candidateName} jobId={jobId} />
        </div>
      </div>

      {/* A tag é uma ferramenta de triagem — só faz sentido editar
          enquanto a candidatura ainda está nessa etapa. */}
      {currentStage === "TRIAGE" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: "1 1 240px" }}>
          <span className="fin-eyebrow">TAG DE TRIAGEM</span>
          <Select value={currentTag} onChange={(e) => handleTagChange(e.target.value as Tag | "")}>
            <option value="">(Nenhuma tag)</option>
            {CANDIDATE_TAGS.map((t) => (
              <option key={t} value={t}>
                {TAG_LABELS[t]}
              </option>
            ))}
          </Select>
          {currentTag && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: "var(--radius-full)", background: TAG_COLORS[currentTag], flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{TAG_NEXT_STEP[currentTag]}</span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Input, Select } from "@/components/ui/Field";
import {
  updateCandidateDados,
  moveCandidateStage,
  setCandidateTag,
} from "@/app/(dashboard)/recrutamento/candidatos/actions";
import { CANDIDATE_STAGES, STAGE_LABELS, CANDIDATE_TAGS, TAG_LABELS, TAG_COLORS, TAG_NEXT_STEP } from "@/schemas/candidate";

type Tag = (typeof CANDIDATE_TAGS)[number];

type Props = {
  candidateId: string;
  stage: (typeof CANDIDATE_STAGES)[number];
  tag: Tag | null;
  initial: { name: string; email: string; phone: string; linkedinUrl: string };
};

export function CandidateDadosForm({ candidateId, stage, tag, initial }: Props) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [currentStage, setCurrentStage] = useState(stage);
  const [currentTag, setCurrentTag] = useState<Tag | "">(tag ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await updateCandidateDados(candidateId, form);

    setSubmitting(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleStageChange(next: (typeof CANDIDATE_STAGES)[number]) {
    setCurrentStage(next);
    await moveCandidateStage(candidateId, next);
    router.refresh();
  }

  async function handleTagChange(next: Tag | "") {
    setCurrentTag(next);
    await setCandidateTag(candidateId, next || null);
    router.refresh();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <form onSubmit={handleSubmit}>
        <Card style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <span className="fin-eyebrow">DADOS DO CANDIDATO</span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            <FieldLabel label="Nome completo" required>
              <Input required value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </FieldLabel>
            <FieldLabel label="E-mail" required>
              <Input type="email" required value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
            </FieldLabel>
            <FieldLabel label="Telefone">
              <Input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
            </FieldLabel>
            <FieldLabel label="LinkedIn">
              <Input value={form.linkedinUrl} onChange={(e) => setForm((p) => ({ ...p, linkedinUrl: e.target.value }))} />
            </FieldLabel>
          </div>

          {error && (
            <div style={{ padding: "12px 16px", borderRadius: "var(--radius-md)", background: "var(--danger-surface)", color: "var(--danger)", fontSize: 13 }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button type="submit" variant={submitting ? "disabled" : "primary"}>
              {submitting ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </Card>
      </form>

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        <Card style={{ display: "flex", flexDirection: "column", gap: 12, flex: "1 1 280px" }}>
          <span className="fin-eyebrow">ESTÁGIO NO PROCESSO</span>
          <Select value={currentStage} onChange={(e) => handleStageChange(e.target.value as (typeof CANDIDATE_STAGES)[number])}>
            {CANDIDATE_STAGES.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABELS[s]}
              </option>
            ))}
          </Select>
        </Card>

        {/* A tag é uma ferramenta de triagem — só faz sentido editar enquanto
            o candidato ainda está nessa etapa. Depois que avança, ela some
            do formulário (o valor continua salvo, só não é mais editável). */}
        {currentStage === "TRIAGE" && (
          <Card style={{ display: "flex", flexDirection: "column", gap: 12, flex: "1 1 280px" }}>
            <span className="fin-eyebrow">TAG DE QUALIFICAÇÃO (TRIAGEM)</span>
            <Select value={currentTag} onChange={(e) => handleTagChange(e.target.value as Tag | "")}>
              <option value="">Sem tag</option>
              {CANDIDATE_TAGS.map((t) => (
                <option key={t} value={t}>
                  {TAG_LABELS[t]}
                </option>
              ))}
            </Select>
            {currentTag && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{ width: 10, height: 10, borderRadius: "var(--radius-full)", background: TAG_COLORS[currentTag], flexShrink: 0 }}
                />
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{TAG_NEXT_STEP[currentTag]}</span>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

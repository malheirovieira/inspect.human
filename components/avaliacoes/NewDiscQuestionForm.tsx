"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { createDiscQuestion } from "@/app/actions/discQuestions";
import { DISC_DIMENSIONS } from "@/lib/disc/questions";

// Renderizado dentro do Card de cada dimensão (ver
// app/(dashboard)/avaliacoes/disc/[id]/page.tsx) — a dimensão já vem fixa
// pelo contexto, sem seletor.
export function NewDiscQuestionForm({
  assessmentId,
  dimension,
}: {
  assessmentId: string;
  dimension: (typeof DISC_DIMENSIONS)[number];
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await createDiscQuestion(assessmentId, dimension, text);
    setSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setText("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 12 }}>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder="Texto da afirmação (ex.: Gosta de assumir a liderança em grupos.)"
      />
      {error && <span className="fin-field-error">{error}</span>}
      <div>
        <Button type="submit" variant={submitting ? "disabled" : "secondary"}>
          <Plus size={14} />
          {submitting ? "Adicionando..." : "Adicionar Pergunta"}
        </Button>
      </div>
    </form>
  );
}

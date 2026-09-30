"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Input, Select } from "@/components/ui/Field";
import { createDiscAssessment } from "@/app/actions/discQuestions";
import { createQuizAssessment } from "@/app/actions/quizAssessments";

type AssessmentType = "DISC" | "SCORED" | "UNSCORED";

// Ao criar, o recrutador escolhe o tipo — decide o motor de cálculo e o
// editor de perguntas que vai usar depois (DiscQuestionsEditor ou
// QuizQuestionsEditor, cada avaliação sempre criada vazia, sem perguntas).
export function NewAssessmentSection() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<AssessmentType>("DISC");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result =
      type === "DISC"
        ? await createDiscAssessment(title)
        : await createQuizAssessment(title, type === "SCORED");

    setSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }

    router.refresh();
    setCreating(false);
    setTitle("");
  }

  if (!creating) {
    return (
      <div>
        <Button type="button" variant="primary" onClick={() => setCreating(true)}>
          <Plus size={16} />
          Nova Avaliação
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <span className="fin-eyebrow">NOVA AVALIAÇÃO</span>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          <FieldLabel label="Nome da avaliação" required>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Teste de Lógica" required />
          </FieldLabel>
          <FieldLabel label="Tipo" required>
            <Select value={type} onChange={(e) => setType(e.target.value as AssessmentType)}>
              <option value="DISC">DISC (perfil comportamental)</option>
              <option value="SCORED">Pontuação (múltipla escolha, com gabarito)</option>
              <option value="UNSCORED">Sem pontuação (só coleta as respostas)</option>
            </Select>
          </FieldLabel>
        </div>

        {error && <span className="fin-field-error">{error}</span>}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button type="button" variant="secondary" onClick={() => setCreating(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" variant={submitting ? "disabled" : "confirm"}>
            {submitting ? "Criando..." : "Criar"}
          </Button>
        </div>
      </Card>
    </form>
  );
}

"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Field";
import { addQuizQuestion } from "@/app/actions/quizAssessments";

type ChoiceDraft = { text: string; isCorrect: boolean };

// scored decide se aparece o rádio "correta" por opção (gabarito) ou só o
// campo de texto — avaliação "Sem pontuação" nunca marca isCorrect.
export function NewQuizQuestionForm({ assessmentId, scored }: { assessmentId: string; scored: boolean }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [maxScore, setMaxScore] = useState(1);
  const [choices, setChoices] = useState<ChoiceDraft[]>([{ text: "", isCorrect: false }, { text: "", isCorrect: false }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateChoice(index: number, patch: Partial<ChoiceDraft>) {
    setChoices((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  function setCorrect(index: number) {
    setChoices((prev) => prev.map((c, i) => ({ ...c, isCorrect: i === index })));
  }

  function addChoice() {
    setChoices((prev) => [...prev, { text: "", isCorrect: false }]);
  }

  function removeChoice(index: number) {
    setChoices((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await addQuizQuestion(assessmentId, {
      text,
      maxScore: scored ? maxScore : 1,
      choices: choices.map((c) => ({ text: c.text, isCorrect: c.isCorrect })),
    });

    setSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setText("");
    setMaxScore(1);
    setChoices([{ text: "", isCorrect: false }, { text: "", isCorrect: false }]);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 12 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder="Texto da pergunta"
          style={{ flex: 1 }}
        />
        {scored && (
          <Input
            type="number"
            min={1}
            value={maxScore}
            onChange={(e) => setMaxScore(Number(e.target.value) || 1)}
            style={{ width: 90 }}
            title="Valor da pergunta (pontos)"
          />
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {choices.map((choice, index) => (
          <div key={index} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {scored && (
              <input
                type="radio"
                name={`correct-${assessmentId}`}
                checked={choice.isCorrect}
                onChange={() => setCorrect(index)}
                title="Marcar como correta"
              />
            )}
            <Input
              value={choice.text}
              onChange={(e) => updateChoice(index, { text: e.target.value })}
              placeholder={`Opção ${index + 1}`}
              style={{ flex: 1 }}
            />
            {choices.length > 2 && (
              <Button type="button" variant="icon-cancel" onClick={() => removeChoice(index)} aria-label="Remover opção">
                <X size={14} />
              </Button>
            )}
          </div>
        ))}
        <div>
          <Button type="button" variant="secondary" onClick={addChoice}>
            <Plus size={14} />
            Opção
          </Button>
        </div>
      </div>

      {error && <span className="fin-field-error">{error}</span>}

      <div>
        <Button type="submit" variant={submitting ? "disabled" : "confirm"}>
          <Plus size={14} />
          {submitting ? "Adicionando..." : "Adicionar Pergunta"}
        </Button>
      </div>
    </form>
  );
}

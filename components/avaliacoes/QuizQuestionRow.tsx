"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { deleteQuizQuestion } from "@/app/actions/quizAssessments";

type Choice = { id: string; text: string; isCorrect: boolean };

export function QuizQuestionRow({
  questionId,
  position,
  text,
  maxScore,
  scored,
  choices,
}: {
  questionId: string;
  position: number;
  text: string;
  maxScore: number;
  scored: boolean;
  choices: Choice[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    setError(null);
    const result = await deleteQuizQuestion(questionId);
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div style={{ padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, color: "var(--ink)", margin: 0 }}>
            {position + 1}. {text} {scored && <span style={{ color: "var(--text-muted)", fontSize: 12 }}>({maxScore} pts)</span>}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 6 }}>
            {choices.map((c) => (
              <span key={c.id} style={{ fontSize: 13, color: c.isCorrect ? "var(--action-confirm-text, #177f0f)" : "var(--text-muted)" }}>
                {c.isCorrect && scored ? "✓ " : "– "}
                {c.text}
              </span>
            ))}
          </div>
        </div>
        <Button type="button" variant="danger" onClick={handleDelete} disabled={loading} aria-label="Excluir pergunta" style={{ padding: "6px 10px", flexShrink: 0 }}>
          <Trash2 size={14} />
        </Button>
      </div>
      {error && <span className="fin-field-error">{error}</span>}
    </div>
  );
}

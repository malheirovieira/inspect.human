"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { deleteDiscAssessment } from "@/app/actions/discQuestions";
import { deleteQuizAssessment } from "@/app/actions/quizAssessments";

// Compartilhado entre DISC e Quiz — a action escolhida já decide sozinha
// entre apagar de verdade ou só arquivar (active=false) quando existem
// respostas de candidatos; aqui só avisamos o resultado.
export function DeleteAssessmentButton({ id, kind }: { id: string; kind: "DISC" | "QUIZ" }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    setError(null);
    const result = kind === "DISC" ? await deleteDiscAssessment(id) : await deleteQuizAssessment(id);
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }
    if (result.archived) {
      window.alert("Esta avaliação já tem respostas de candidatos, então foi arquivada (não aparece mais para novos envios) em vez de excluída — os resultados existentes continuam disponíveis.");
    }
    router.refresh();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
      <Button
        type="button"
        variant="danger"
        onClick={() => dialogRef.current?.showModal()}
        disabled={loading}
        aria-label="Excluir avaliação"
        title="Excluir avaliação"
        style={{ padding: "6px 10px" }}
      >
        <Trash2 size={14} />
      </Button>
      {error && <span className="fin-field-error">{error}</span>}
      <ConfirmDialog
        ref={dialogRef}
        title="Excluir avaliação"
        message="Tem certeza? Se já houver candidatos que responderam, a avaliação será arquivada em vez de excluída para preservar os resultados. Caso contrário, será apagada permanentemente."
        confirmLabel="Excluir"
        variant="danger"
        onConfirm={handleDelete}
      />
    </div>
  );
}

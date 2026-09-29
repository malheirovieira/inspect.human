"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { resetDiscQuestions } from "@/app/actions/discQuestions";

export function ResetDiscQuestionsButton() {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReset() {
    setLoading(true);
    setError(null);
    const result = await resetDiscQuestions();
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
      <Button type="button" variant="secondary" onClick={() => dialogRef.current?.showModal()} disabled={loading}>
        <RotateCcw size={14} />
        {loading ? "Restaurando..." : "Restaurar Padrão"}
      </Button>
      {error && <span className="fin-field-error">{error}</span>}
      <ConfirmDialog
        ref={dialogRef}
        title="Restaurar perguntas"
        message="Deseja restaurar todas as perguntas para o texto original? Esta ação não pode ser desfeita."
        confirmLabel="Restaurar Padrão"
        variant="warning"
        onConfirm={handleReset}
      />
    </div>
  );
}

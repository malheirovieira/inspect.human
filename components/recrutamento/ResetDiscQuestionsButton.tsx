"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { resetDiscQuestions } from "@/app/actions/discQuestions";

export function ResetDiscQuestionsButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    const confirmed = window.confirm(
      "Deseja restaurar todas as perguntas para o texto original?\n\nEsta ação não pode ser desfeita."
    );
    if (!confirmed) return;

    setLoading(true);
    const result = await resetDiscQuestions();
    setLoading(false);

    if (!result.success) {
      window.alert(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <Button type="button" variant="secondary" onClick={handleReset} disabled={loading}>
      <RotateCcw size={14} />
      {loading ? "Restaurando..." : "Restaurar Padrão"}
    </Button>
  );
}

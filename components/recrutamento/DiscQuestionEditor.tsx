"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { updateDiscQuestion, deleteDiscQuestion } from "@/app/actions/discQuestions";

export function DiscQuestionEditor({
  questionId,
  position,
  text,
  deletable,
}: {
  questionId: string;
  position: number;
  text: string;
  // Só perguntas criadas pelo recrutador (avaliações DISC customizadas)
  // podem ser excluídas — as 60 afirmações do modelo padrão só têm o texto
  // editável (ResetDiscQuestionsButton depende delas continuarem existindo).
  deletable?: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(text);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (value.trim() === text) {
      setEditing(false);
      return;
    }

    setLoading(true);
    setError(null);
    const result = await updateDiscQuestion(questionId, value);
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  function handleCancel() {
    setValue(text);
    setEditing(false);
    setError(null);
  }

  async function handleDelete() {
    setLoading(true);
    setError(null);
    const result = await deleteDiscQuestion(questionId);
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        padding: "12px 0",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <span style={{ fontSize: 13, color: "var(--text-muted)", width: 24, flexShrink: 0, marginTop: 2 }}>{position}.</span>

      <div style={{ flex: 1 }}>
        {editing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Textarea value={value} onChange={(e) => setValue(e.target.value)} rows={3} autoFocus />
            {error && <span className="fin-field-error">{error}</span>}
            <div style={{ display: "flex", gap: 8 }}>
              <Button type="button" variant={loading ? "disabled" : "confirm"} onClick={handleSave}>
                <Check size={14} />
                {loading ? "Salvando..." : "Salvar"}
              </Button>
              <Button type="button" variant="secondary" onClick={handleCancel} disabled={loading}>
                <X size={14} />
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <p style={{ fontSize: 14, color: "var(--ink)", lineHeight: 1.5, margin: 0 }}>{text}</p>
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditing(true)}
                aria-label="Editar pergunta"
                title="Editar pergunta"
                style={{ padding: "6px 10px" }}
              >
                <Pencil size={14} />
              </Button>
              {deletable && (
                <Button
                  type="button"
                  variant="danger"
                  onClick={handleDelete}
                  disabled={loading}
                  aria-label="Excluir pergunta"
                  title="Excluir pergunta"
                  style={{ padding: "6px 10px" }}
                >
                  <Trash2 size={14} />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

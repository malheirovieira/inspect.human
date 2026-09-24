"use client";

import { useEffect, useState, useTransition, type KeyboardEvent } from "react";
import { Plus, X } from "lucide-react";
import { updateAnalysisSkills } from "@/app/(dashboard)/recrutamento/banco-de-talentos/aiActions";

const MAX_TAGS = 12;

// Tags de competência do resumo por IA, editáveis pelo recrutador: clicar
// numa tag renomeia, o "×" (vermelho) remove, "+ Tag" adiciona. Cada mudança
// salva na hora e marca as tags como editadas (nova geração pede
// confirmação antes de sobrescrever).
export function SkillTagsEditor({ analysisId, initial, edited }: { analysisId: string; initial: string[]; edited: boolean }) {
  const [tags, setTags] = useState(initial);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Nova geração (ou refresh) traz outra lista do servidor.
  useEffect(() => setTags(initial), [initial]);

  function save(next: string[]) {
    const previous = tags;
    setTags(next);
    setError(null);
    startTransition(async () => {
      const result = await updateAnalysisSkills(analysisId, next);
      if ("error" in result) {
        setTags(previous);
        setError(result.error);
      }
    });
  }

  function commitDraft() {
    const value = draft.trim();
    if (editingIndex !== null) {
      if (value && value !== tags[editingIndex]) save(tags.map((t, i) => (i === editingIndex ? value : t)));
      setEditingIndex(null);
    } else if (adding) {
      if (value) save([...tags, value]);
      setAdding(false);
    }
    setDraft("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitDraft();
    }
    if (e.key === "Escape") {
      setEditingIndex(null);
      setAdding(false);
      setDraft("");
    }
  }

  const chip = {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    height: 28,
    padding: "0 6px 0 10px",
    borderRadius: "var(--radius-full)",
    background: "var(--surface-muted)",
    fontSize: 12,
    fontWeight: 500,
    color: "var(--text-primary)",
  } as const;

  const inlineInput = (
    <input
      autoFocus
      value={draft}
      maxLength={40}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commitDraft}
      onKeyDown={onKeyDown}
      className="fin-input"
      style={{ height: 28, width: 150, fontSize: 12, padding: "0 10px", borderRadius: "var(--radius-full)" }}
    />
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, opacity: pending ? 0.7 : 1 }}>
        {tags.map((tag, i) =>
          editingIndex === i ? (
            <span key={`edit-${i}`}>{inlineInput}</span>
          ) : (
            <span key={`${tag}-${i}`} style={chip}>
              <button
                type="button"
                onClick={() => {
                  setAdding(false);
                  setEditingIndex(i);
                  setDraft(tag);
                }}
                title="Clique para editar"
                style={{ background: "none", border: "none", padding: 0, font: "inherit", color: "inherit", cursor: "text" }}
              >
                {tag}
              </button>
              <button
                type="button"
                onClick={() => save(tags.filter((_, j) => j !== i))}
                aria-label={`Remover tag ${tag}`}
                className="fin-icon-danger"
                style={{ background: "none", border: "none", padding: 2, cursor: "pointer", display: "flex" }}
              >
                <X size={12} />
              </button>
            </span>
          )
        )}
        {adding
          ? inlineInput
          : tags.length < MAX_TAGS && (
              <button
                type="button"
                onClick={() => {
                  setEditingIndex(null);
                  setAdding(true);
                  setDraft("");
                }}
                style={{ ...chip, padding: "0 10px", background: "none", border: "1px dashed var(--border)", cursor: "pointer", color: "var(--text-secondary)" }}
              >
                <Plus size={12} /> Tag
              </button>
            )}
      </div>
      {edited && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Tags editadas manualmente</span>}
      {error && <span className="fin-field-error">{error}</span>}
    </div>
  );
}

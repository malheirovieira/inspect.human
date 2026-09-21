"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { addCandidateNote } from "@/app/(dashboard)/recrutamento/candidatos/actions";

export function CandidateNotes({ candidateId, notes }: { candidateId: string; notes: string | null }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await addCandidateNote(candidateId, note);

    setSubmitting(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setNote("");
    router.refresh();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Card>
        <span className="fin-eyebrow">HISTÓRICO DO PROCESSO</span>
        {notes ? (
          <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 13, marginTop: 12, color: "var(--text-secondary)" }}>
            {notes}
          </pre>
        ) : (
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 12 }}>Nenhuma anotação registrada ainda.</p>
        )}
      </Card>

      <form onSubmit={handleSubmit}>
        <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <span className="fin-eyebrow">ADICIONAR ANOTAÇÃO</span>
          <Textarea
            required
            placeholder="Ex.: Entrevista técnica marcada para sexta-feira às 14h."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          {error && (
            <div style={{ padding: "12px 16px", borderRadius: "var(--radius-md)", background: "var(--danger-surface)", color: "var(--danger)", fontSize: 13 }}>
              {error}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button type="submit" variant={submitting ? "disabled" : "primary"}>
              {submitting ? "Salvando..." : "Adicionar"}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}

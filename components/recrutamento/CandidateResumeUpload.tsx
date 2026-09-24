"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { uploadCandidateResume } from "@/app/(dashboard)/recrutamento/banco-de-talentos/actions";

export function CandidateResumeUpload({
  candidateId,
  submitLabel = "Anexar currículo",
}: {
  candidateId: string;
  submitLabel?: string;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!file) return;
    setSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.set("resume", file);
    const result = await uploadCandidateResume(candidateId, formData);

    setSubmitting(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setFile(null);
    (event.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <input
        type="file"
        accept="application/pdf"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="fin-input"
        style={{ padding: "9px 14px", width: "auto" }}
      />
      {error && <div style={{ fontSize: 12, color: "var(--danger)" }}>{error}</div>}
      <Button type="submit" variant={!file || submitting ? "disabled" : "confirm"}>
        {submitting ? "Enviando..." : submitLabel}
      </Button>
    </form>
  );
}

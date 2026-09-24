"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FileDropzone } from "@/components/ui/FileDropzone";
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
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, width: "100%", maxWidth: 420, margin: "0 auto" }}
    >
      <FileDropzone file={file} onFileChange={setFile} disabled={submitting} />
      {error && <div className="fin-field-error">{error}</div>}
      {file && (
        <Button type="submit" variant={submitting ? "disabled" : "confirm"}>
          {submitting ? "Enviando..." : submitLabel}
        </Button>
      )}
    </form>
  );
}

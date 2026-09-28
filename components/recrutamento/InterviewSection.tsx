"use client";

import { useState } from "react";
import type { Interview } from "@prisma/client";
import { Calendar } from "lucide-react";
import { InterviewCard } from "./InterviewCard";
import { InterviewForm } from "./InterviewForm";

// Componente único que decide o que mostrar (botão tracejado, formulário
// inline expandido, ou card com a entrevista) — nunca modal/overlay, mesmo
// padrão de edição inline do resto do projeto (ver components/ui/EditLock).
export function InterviewSection({
  applicationId,
  interviews = [],
}: {
  applicationId: string;
  interviews?: Interview[];
}) {
  const [editing, setEditing] = useState(false);
  const interview = interviews[0];

  if (editing) {
    return (
      <InterviewForm
        applicationId={applicationId}
        initial={interview}
        onCancel={() => setEditing(false)}
        onSaved={() => setEditing(false)}
      />
    );
  }

  if (interview) {
    return <InterviewCard interview={interview} applicationId={applicationId} onEdit={() => setEditing(true)} />;
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      style={{
        width: "100%",
        padding: 24,
        border: "2px dashed var(--border)",
        borderRadius: "var(--radius-md)",
        textAlign: "center",
        cursor: "pointer",
        background: "transparent",
      }}
    >
      <Calendar size={24} style={{ color: "var(--text-muted)", margin: "0 auto 8px" }} />
      <p style={{ fontWeight: 500, color: "var(--text-muted)", margin: 0 }}>Agendar Entrevista</p>
    </button>
  );
}

"use client";

import { useState } from "react";
import type { Interview } from "@prisma/client";
import { Calendar } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { InterviewCard } from "./InterviewCard";
import { InterviewForm } from "./InterviewForm";

// Componente único que decide o que mostrar (botão de agendar, formulário
// inline expandido, ou card com a entrevista) — nunca modal/overlay, mesmo
// padrão de edição inline do resto do projeto (ver components/ui/EditLock).
export function InterviewSection({
  applicationId,
  interviews = [],
  // Perfil já classificado como GREEN ("Perfil compatível") na triagem —
  // destaca o card com borda amarela pulsando pra lembrar de agendar.
  // Só faz sentido enquanto ainda não há entrevista marcada.
  highlightScheduling = false,
}: {
  applicationId: string;
  interviews?: Interview[];
  highlightScheduling?: boolean;
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
    <Card
      className={cn(highlightScheduling && "fin-card--attention")}
      style={{ padding: 0, overflow: "hidden" }}
    >
      <button
        type="button"
        onClick={() => setEditing(true)}
        style={{
          width: "100%",
          padding: 24,
          border: "none",
          textAlign: "center",
          cursor: "pointer",
          background: "transparent",
        }}
      >
        <Calendar size={24} style={{ color: "var(--text-muted)", margin: "0 auto 8px" }} />
        <p style={{ fontWeight: 500, color: "var(--text-muted)", margin: 0 }}>Agendar Entrevista</p>
      </button>
    </Card>
  );
}

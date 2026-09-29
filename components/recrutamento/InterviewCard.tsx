"use client";

import { useState } from "react";
import type { Interview } from "@prisma/client";
import { cancelInterview, sendInterviewLink } from "@/app/actions/scheduleInterview";
import { useRouter } from "next/navigation";
import { AlertTriangle, Calendar, FileText, Link2, MapPin, Send, User, Users } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Agendada",
  COMPLETED: "Concluída",
  CANCELLED: "Cancelada",
};

export function InterviewCard({
  interview,
  applicationId,
  onEdit,
}: {
  interview: Interview;
  applicationId: string;
  onEdit: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);

  async function handleCancel() {
    if (!confirm("Deseja cancelar essa entrevista?")) return;

    setLoading(true);
    const result = await cancelInterview(applicationId);

    if (!result.success) {
      alert(result.error || "Erro ao cancelar.");
      setLoading(false);
      return;
    }
    router.refresh();
  }

  async function handleSendLink() {
    if (!interview.interviewLink) return;

    setSendingLink(true);
    const result = await sendInterviewLink(applicationId, interview.interviewLink);
    setSendingLink(false);

    if (!result.success) {
      alert(result.error || "Erro ao enviar link.");
      return;
    }
    router.refresh();
  }

  const formatted = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(interview.scheduledAt));

  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span className="fin-eyebrow">ENTREVISTA</span>
        <span
          style={{
            padding: "4px 12px",
            borderRadius: "var(--radius-full)",
            background: "var(--success-surface)",
            color: "var(--success)",
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          {STATUS_LABELS[interview.status] ?? interview.status}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 14 }}>
          <Calendar size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
          <span style={{ fontWeight: 500, color: "var(--ink)" }}>{formatted}</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 14 }}>
          <MapPin size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
          <span style={{ color: "var(--ink)" }}>{interview.modality === "REMOTO" ? "Remoto" : "Presencial"}</span>
        </div>

        {interview.interviewerName && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 14 }}>
            <User size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
            <span style={{ color: "var(--ink)" }}>{interview.interviewerName}</span>
          </div>
        )}

        {interview.guests && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, fontSize: 14 }}>
            <Users size={16} style={{ color: "var(--text-muted)", flexShrink: 0, marginTop: 2 }} />
            <span style={{ color: "var(--ink)" }}>{interview.guests}</span>
          </div>
        )}

        {interview.status === "SCHEDULED" && interview.modality === "REMOTO" && interview.interviewLink && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              padding: 12,
              borderRadius: "var(--radius-md)",
              background: "var(--surface-muted)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, fontSize: 14 }}>
              <Link2 size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
              <a
                href={interview.interviewLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              >
                {interview.interviewLink}
              </a>
            </div>
            <Button type="button" variant="secondary" onClick={handleSendLink} disabled={sendingLink}>
              <Send size={14} />
              {sendingLink ? "Enviando..." : "Enviar Link"}
            </Button>
          </div>
        )}

        {interview.status === "SCHEDULED" && interview.modality === "REMOTO" && !interview.interviewLink && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              padding: 12,
              borderRadius: "var(--radius-md)",
              background: "var(--danger-surface)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 14 }}>
              <AlertTriangle size={16} style={{ color: "var(--danger)", flexShrink: 0 }} />
              <span style={{ color: "var(--danger)" }}>Link de entrevista não adicionado</span>
            </div>
            <Button type="button" variant="secondary" onClick={onEdit}>
              Adicionar Link
            </Button>
          </div>
        )}

        {interview.notes && (
          <div
            style={{
              display: "flex",
              gap: 12,
              padding: 12,
              borderRadius: "var(--radius-md)",
              background: "var(--surface-muted)",
            }}
          >
            <FileText size={16} style={{ color: "var(--text-muted)", flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: 13, color: "var(--ink)", margin: 0 }}>{interview.notes}</p>
          </div>
        )}
      </div>

      {interview.status === "SCHEDULED" && (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
          <Button type="button" variant="secondary" onClick={onEdit} disabled={loading}>
            Editar
          </Button>
          <Button type="button" variant="danger" onClick={handleCancel} disabled={loading}>
            {loading ? "Cancelando..." : "Cancelar"}
          </Button>
        </div>
      )}
    </Card>
  );
}

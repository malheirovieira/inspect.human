"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Interview } from "@prisma/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Input, Select, Textarea } from "@/components/ui/Field";
import { scheduleInterview } from "@/app/actions/scheduleInterview";

// Extrai data (YYYY-MM-DD) e hora (HH:mm) no fuso LOCAL do navegador a
// partir de um Date — usar toISOString() aqui cortaria pro fuso UTC e
// mostraria hora errada pra quem está em GMT-3.
function toLocalDateInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function toLocalTimeInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function InterviewForm({
  applicationId,
  initial,
  onCancel,
  onSaved,
}: {
  applicationId: string;
  // Presente = reagendamento (pré-preenche); ausente = primeiro agendamento.
  initial?: Interview;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const [date, setDate] = useState(initial ? toLocalDateInput(new Date(initial.scheduledAt)) : "");
  const [time, setTime] = useState(initial ? toLocalTimeInput(new Date(initial.scheduledAt)) : "");
  const [modality, setModality] = useState(initial?.modality ?? "PRESENCIAL");
  const [interviewerName, setInterviewerName] = useState(initial?.interviewerName ?? "");
  const [guests, setGuests] = useState(initial?.guests ?? "");
  const [interviewLink, setInterviewLink] = useState(initial?.interviewLink ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = toLocalDateInput(new Date());

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!date || !time) {
      setError("Data e horário são obrigatórios.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const result = await scheduleInterview(
      applicationId,
      new Date(`${date}T${time}`),
      notes || undefined,
      modality,
      interviewerName || undefined,
      guests || undefined,
      interviewLink || undefined
    );

    setSubmitting(false);
    if (!result.success) {
      setError(result.error || "Erro ao agendar entrevista.");
      return;
    }

    router.refresh();
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Card style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <span className="fin-eyebrow">{initial ? "REAGENDAR ENTREVISTA" : "AGENDAR ENTREVISTA"}</span>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
          <FieldLabel label="Data" required>
            <Input type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)} required />
          </FieldLabel>
          <FieldLabel label="Horário" required>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
          </FieldLabel>
          <FieldLabel label="Modalidade" required>
            <Select value={modality} onChange={(e) => setModality(e.target.value)}>
              <option value="PRESENCIAL">Presencial</option>
              <option value="REMOTO">Remoto</option>
            </Select>
          </FieldLabel>
          <FieldLabel label="Entrevistador">
            <Input
              value={interviewerName}
              onChange={(e) => setInterviewerName(e.target.value)}
              placeholder="Nome do entrevistador"
            />
          </FieldLabel>
          <FieldLabel label="Convidados">
            <Input value={guests} onChange={(e) => setGuests(e.target.value)} placeholder="João Silva, Maria Santos" />
          </FieldLabel>
        </div>

        <FieldLabel label="Link da entrevista">
          <Input
            type="url"
            value={interviewLink}
            onChange={(e) => setInterviewLink(e.target.value)}
            placeholder="https://meet.google.com/..."
          />
        </FieldLabel>

        <FieldLabel label="Notas">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Trazer documentos, levar notebook..."
            rows={3}
          />
        </FieldLabel>

        {error && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "var(--radius-md)",
              background: "var(--danger-surface)",
              color: "var(--danger)",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" variant={submitting ? "disabled" : "confirm"}>
            {submitting ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </Card>
    </form>
  );
}

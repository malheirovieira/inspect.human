"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Input, Select, Textarea } from "@/components/ui/Field";
import { createEmployeeExit } from "@/app/(dashboard)/desligamentos/actions";
import { EXIT_TYPES, EXIT_TYPE_LABELS, EXIT_REASONS, EXIT_REASON_LABELS } from "@/schemas/employeeExit";

type Colaborador = { id: string; name: string; position: string | null; department: string | null };

export function EmployeeExitForm({
  colaboradores,
  onCreated,
}: {
  colaboradores: Colaborador[];
  onCreated?: () => void;
}) {
  const router = useRouter();
  const [userId, setUserId] = useState(colaboradores[0]?.id ?? "");
  const [exitDate, setExitDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [exitType, setExitType] = useState<(typeof EXIT_TYPES)[number]>("VOLUNTARIA");
  const [reason, setReason] = useState<(typeof EXIT_REASONS)[number]>("PEDIU_DEMISSAO");
  const [notes, setNotes] = useState("");
  const [rehireEligible, setRehireEligible] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await createEmployeeExit({ userId, exitDate, exitType, reason, notes, rehireEligible });

    setSubmitting(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    router.refresh();
    onCreated?.();
  }

  if (colaboradores.length === 0) {
    return (
      <Card>
        <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)" }}>
          Não há colaboradores ativos para desligar no momento.
        </p>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          <FieldLabel label="Colaborador" required>
            <Select required value={userId} onChange={(e) => setUserId(e.target.value)}>
              {colaboradores.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.position ? ` — ${c.position}` : ""}
                </option>
              ))}
            </Select>
          </FieldLabel>
          <FieldLabel label="Data de saída" required>
            <Input type="date" required value={exitDate} onChange={(e) => setExitDate(e.target.value)} />
          </FieldLabel>
          <FieldLabel label="Tipo de desligamento" required>
            <Select required value={exitType} onChange={(e) => setExitType(e.target.value as (typeof EXIT_TYPES)[number])}>
              {EXIT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {EXIT_TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          </FieldLabel>
          <FieldLabel label="Motivo" required>
            <Select required value={reason} onChange={(e) => setReason(e.target.value as (typeof EXIT_REASONS)[number])}>
              {EXIT_REASONS.map((r) => (
                <option key={r} value={r}>
                  {EXIT_REASON_LABELS[r]}
                </option>
              ))}
            </Select>
          </FieldLabel>
          <FieldLabel label="Elegível para recontratação?" required>
            <Select
              required
              value={rehireEligible ? "sim" : "nao"}
              onChange={(e) => setRehireEligible(e.target.value === "sim")}
            >
              <option value="sim">Sim</option>
              <option value="nao">Não</option>
            </Select>
          </FieldLabel>
        </div>

        <FieldLabel label="Observações (entrevista de desligamento, contexto etc.)">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} style={{ minHeight: 120 }} />
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

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button type="submit" variant={submitting ? "disabled" : "confirm"}>
            {submitting ? "Registrando..." : "Registrar desligamento"}
          </Button>
        </div>
      </Card>
    </form>
  );
}

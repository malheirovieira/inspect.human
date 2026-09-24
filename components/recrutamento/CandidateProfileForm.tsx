"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Input } from "@/components/ui/Field";
import { formatPhone } from "@/lib/phoneMask";
import { updateCandidateDados } from "@/app/(dashboard)/recrutamento/banco-de-talentos/actions";

// Dados da PESSOA (nome/e-mail/telefone/LinkedIn) — etapa e tag de
// qualificação não moram mais aqui, são da candidatura (ver a página de
// detalhe da candidatura, /recrutamento/vagas/[jobId]/candidaturas/[id]).
export function CandidateProfileForm({
  candidateId,
  initial,
}: {
  candidateId: string;
  initial: { name: string; email: string; phone: string; linkedinUrl: string };
}) {
  const router = useRouter();
  const [form, setForm] = useState({ ...initial, phone: formatPhone(initial.phone) });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await updateCandidateDados(candidateId, { ...form, phone: form.phone.replace(/\D/g, "") });

    setSubmitting(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <span className="fin-eyebrow">PERFIL</span>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          <FieldLabel label="Nome completo" required>
            <Input required value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          </FieldLabel>
          <FieldLabel label="E-mail" required>
            <Input type="email" required value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
          </FieldLabel>
          <FieldLabel label="Telefone">
            <Input
              type="tel"
              placeholder="(11) 91234-5678"
              maxLength={15}
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: formatPhone(e.target.value) }))}
            />
          </FieldLabel>
          <FieldLabel label="LinkedIn">
            <Input value={form.linkedinUrl} onChange={(e) => setForm((p) => ({ ...p, linkedinUrl: e.target.value }))} />
          </FieldLabel>
        </div>

        {error && (
          <div style={{ padding: "12px 16px", borderRadius: "var(--radius-md)", background: "var(--danger-surface)", color: "var(--danger)", fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button type="submit" variant={submitting ? "disabled" : "primary"}>
            {submitting ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </Card>
    </form>
  );
}

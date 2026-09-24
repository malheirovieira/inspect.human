"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { EditLockActions, useEditLock } from "@/components/ui/EditLock";
import { FieldLabel, Input } from "@/components/ui/Field";
import { zodFieldErrors } from "@/lib/fieldErrors";
import { formatPhone } from "@/lib/phoneMask";
import { updateCandidateDadosSchema } from "@/schemas/candidate";
import { updateCandidateDados } from "@/app/(dashboard)/recrutamento/banco-de-talentos/actions";

type ProfileValues = { name: string; email: string; phone: string; linkedinUrl: string };

// Dados da PESSOA (nome/e-mail/telefone/LinkedIn) — etapa e tag de
// qualificação não moram mais aqui, são da candidatura (ver a página de
// detalhe da candidatura, /recrutamento/vagas/[jobId]/candidaturas/[id]).
// Abre BLOQUEADO — mesmo padrão do cadastro da vaga (components/ui/EditLock).
export function CandidateProfileForm({ candidateId, initial }: { candidateId: string; initial: ProfileValues }) {
  const router = useRouter();
  const lock = useEditLock<ProfileValues>({ ...initial, phone: formatPhone(initial.phone) }, true);
  const { values: form, setValues: setForm, locked, fieldErrors } = lock;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (locked) return;
    setError(null);

    const payload = { ...form, phone: form.phone.replace(/\D/g, "") };
    // Mesma validação do servidor, antes de enviar — erro fica embaixo do
    // campo e nada do que foi digitado se perde.
    const check = updateCandidateDadosSchema.safeParse(payload);
    if (!check.success) {
      lock.setFieldErrors(zodFieldErrors(check.error));
      return;
    }

    setSubmitting(true);
    const result = await updateCandidateDados(candidateId, payload);
    setSubmitting(false);

    if ("error" in result) {
      if ("fieldErrors" in result) lock.setFieldErrors(result.fieldErrors);
      else setError(result.error);
      return;
    }
    lock.commit(form);
    router.refresh();
  }

  const set = (key: keyof ProfileValues, value: string) => {
    setForm((p) => ({ ...p, [key]: value }));
    if (fieldErrors[key]) lock.setFieldErrors(({ [key]: _removed, ...rest }) => rest);
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Card style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <span className="fin-eyebrow">PERFIL</span>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          <FieldLabel label="Nome completo" required error={fieldErrors.name}>
            <Input
              disabled={locked}
              aria-invalid={Boolean(fieldErrors.name)}
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </FieldLabel>
          <FieldLabel label="E-mail" required error={fieldErrors.email}>
            <Input
              type="email"
              disabled={locked}
              aria-invalid={Boolean(fieldErrors.email)}
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </FieldLabel>
          <FieldLabel label="Telefone" error={fieldErrors.phone}>
            <Input
              type="tel"
              placeholder="(11) 91234-5678"
              maxLength={15}
              disabled={locked}
              aria-invalid={Boolean(fieldErrors.phone)}
              value={form.phone}
              onChange={(e) => set("phone", formatPhone(e.target.value))}
            />
          </FieldLabel>
          <FieldLabel label="LinkedIn" error={fieldErrors.linkedinUrl}>
            <Input
              disabled={locked}
              aria-invalid={Boolean(fieldErrors.linkedinUrl)}
              value={form.linkedinUrl}
              onChange={(e) => set("linkedinUrl", e.target.value)}
            />
          </FieldLabel>
        </div>

        {error && (
          <div style={{ padding: "12px 16px", borderRadius: "var(--radius-md)", background: "var(--danger-surface)", color: "var(--danger)", fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <EditLockActions
            isExisting
            locked={locked}
            submitting={submitting}
            onEdit={lock.startEdit}
            onCancel={() => {
              setError(null);
              lock.cancel();
            }}
          />
        </div>
      </Card>
    </form>
  );
}

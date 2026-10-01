"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { EditLockActions, useEditLock } from "@/components/ui/EditLock";
import { FieldLabel, Input } from "@/components/ui/Field";
import { zodFieldErrors } from "@/lib/fieldErrors";
import { updateCompanyAddress } from "@/app/(dashboard)/configuracoes/actions";
import { companyAddressSchema, type CompanyAddressInput } from "@/schemas/companyAddress";

// Endereço estruturado — usado só pro jobLocation.address do JobPosting
// JSON-LD das vagas públicas (Sprint 1, multipostagem/SEO). Mesmo padrão de
// bloqueio/edição do resto do sistema (EditLock): abre travado, "Editar"
// libera os campos.
export function CompanyAddressForm({ initial }: { initial: CompanyAddressInput }) {
  const router = useRouter();
  const lock = useEditLock<CompanyAddressInput>(initial, true);
  const { values: form, setValues: setForm, locked, fieldErrors } = lock;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof CompanyAddressInput>(key: K, value: CompanyAddressInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) lock.setFieldErrors(({ [key]: _removed, ...rest }) => rest);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (locked) return;
    setError(null);

    const check = companyAddressSchema.safeParse(form);
    if (!check.success) {
      lock.setFieldErrors(zodFieldErrors(check.error));
      return;
    }

    setSubmitting(true);
    const result = await updateCompanyAddress(form);
    setSubmitting(false);

    if ("error" in result) {
      if ("fieldErrors" in result) lock.setFieldErrors(result.fieldErrors);
      else setError(result.error);
      return;
    }

    lock.commit(form);
    router.refresh();
  }

  const fieldsDisabled = locked;

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Card style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <span className="fin-eyebrow">SEO / GOOGLE JOBS</span>
          <div className="fin-heading" style={{ marginBottom: 0 }}>
            Endereço da empresa
          </div>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            Usado só na marcação estruturada (JSON-LD) das vagas públicas, pra indexação
            no Google for Jobs. Nenhum campo é obrigatório pra continuar usando o sistema.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          <FieldLabel label="Rua e número" error={fieldErrors.addressStreet}>
            <Input
              disabled={fieldsDisabled}
              value={form.addressStreet ?? ""}
              onChange={(e) => update("addressStreet", e.target.value)}
            />
          </FieldLabel>
          <FieldLabel label="Cidade" error={fieldErrors.addressCity}>
            <Input
              disabled={fieldsDisabled}
              value={form.addressCity ?? ""}
              onChange={(e) => update("addressCity", e.target.value)}
            />
          </FieldLabel>
          <FieldLabel label="Estado (UF)" error={fieldErrors.addressState}>
            <Input
              disabled={fieldsDisabled}
              value={form.addressState ?? ""}
              onChange={(e) => update("addressState", e.target.value)}
              maxLength={2}
            />
          </FieldLabel>
          <FieldLabel label="CEP" error={fieldErrors.addressZip}>
            <Input
              disabled={fieldsDisabled}
              value={form.addressZip ?? ""}
              onChange={(e) => update("addressZip", e.target.value)}
            />
          </FieldLabel>
          <FieldLabel label="País" error={fieldErrors.addressCountry}>
            <Input
              disabled={fieldsDisabled}
              value={form.addressCountry ?? "BR"}
              onChange={(e) => update("addressCountry", e.target.value)}
              maxLength={2}
            />
          </FieldLabel>
        </div>

        {error && <span className="fin-field-error">{error}</span>}

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

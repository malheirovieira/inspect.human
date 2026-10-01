"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EditLockActions, useEditLock } from "@/components/ui/EditLock";
import { FieldLabel, Input } from "@/components/ui/Field";
import { zodFieldErrors } from "@/lib/fieldErrors";
import { updateCompanyIntegrations } from "@/app/(dashboard)/configuracoes/actions";
import { companyIntegrationsSchema, type CompanyIntegrationsInput } from "@/schemas/companyIntegrations";

// Indeed é self-service (só o e-mail da conta de empregador). LinkedIn e
// InfoJobs exigem parceria comercial prévia da Inspect Talent — o campo
// pode ser preenchido desde já, mas só funciona quando a flag global
// correspondente for ligada (ver lib/config/jobBoards.ts).
export function JobBoardIntegrationsForm({
  initial,
  linkedinLive,
  infojobsLive,
}: {
  initial: CompanyIntegrationsInput;
  linkedinLive: boolean;
  infojobsLive: boolean;
}) {
  const router = useRouter();
  const lock = useEditLock<CompanyIntegrationsInput>(initial, true);
  const { values: form, setValues: setForm, locked, fieldErrors } = lock;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof CompanyIntegrationsInput>(key: K, value: CompanyIntegrationsInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) lock.setFieldErrors(({ [key]: _removed, ...rest }) => rest);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (locked) return;
    setError(null);

    const check = companyIntegrationsSchema.safeParse(form);
    if (!check.success) {
      lock.setFieldErrors(zodFieldErrors(check.error));
      return;
    }

    setSubmitting(true);
    const result = await updateCompanyIntegrations(form);
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
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <span className="fin-eyebrow">GOOGLE FOR JOBS</span>
          <Badge tone="success">Ativo</Badge>
        </div>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
          Ativo automaticamente para toda vaga pública, via dados estruturados (JSON-LD).
          Nenhum cadastro necessário aqui — o controle de publicar ou não uma vaga
          específica fica no cadastro da vaga, não nesta tela.
        </p>
      </Card>

      <Card style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <span className="fin-eyebrow">JOOBLE</span>
          <Badge tone="success">Ativo</Badge>
        </div>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
          Ativo via parceria da Inspect Talent com o Jooble. Nenhum cadastro necessário
          por empresa.
        </p>
      </Card>

      <form onSubmit={handleSubmit} noValidate>
        <Card style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <span className="fin-eyebrow">INDEED</span>
              <Badge tone={form.indeedEmployerEmail ? "success" : "danger"}>
                {form.indeedEmployerEmail ? "Configurado" : "Pendente"}
              </Badge>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 12px" }}>
              E-mail da sua conta de empregador no Indeed. Não tem uma ainda?{" "}
              <a href="https://employers.indeed.com" target="_blank" rel="noreferrer" style={{ color: "var(--accent-link)" }}>
                Criar conta de empregador
              </a>
              .
            </p>
            <FieldLabel label="E-mail da conta Indeed" error={fieldErrors.indeedEmployerEmail}>
              <Input
                type="email"
                disabled={fieldsDisabled}
                value={form.indeedEmployerEmail ?? ""}
                onChange={(e) => update("indeedEmployerEmail", e.target.value)}
                placeholder="rh@suaempresa.com"
              />
            </FieldLabel>
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <span className="fin-eyebrow">LINKEDIN</span>
              <Badge tone={linkedinLive ? (form.linkedinCompanyId ? "success" : "danger") : "primary"}>
                {linkedinLive ? (form.linkedinCompanyId ? "Configurado" : "Pendente") : "Em homologação"}
              </Badge>
            </div>
            <div
              style={{
                display: "flex",
                gap: 8,
                padding: "10px 12px",
                margin: "4px 0 12px",
                borderRadius: "var(--radius-md)",
                background: "var(--attention-surface)",
                color: "var(--attention)",
                fontSize: 13,
              }}
            >
              A publicação automática no LinkedIn depende de aprovação comercial da
              Inspect Talent junto ao LinkedIn (processo em andamento). Preencha o campo
              desde já — ele será usado assim que a integração for aprovada.
            </div>
            <FieldLabel label="ID da empresa no LinkedIn" error={fieldErrors.linkedinCompanyId}>
              <Input
                disabled={fieldsDisabled}
                value={form.linkedinCompanyId ?? ""}
                onChange={(e) => update("linkedinCompanyId", e.target.value)}
              />
            </FieldLabel>
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <span className="fin-eyebrow">INFOJOBS</span>
              <Badge tone={infojobsLive ? (form.infojobsId ? "success" : "danger") : "primary"}>
                {infojobsLive ? (form.infojobsId ? "Configurado" : "Pendente") : "Em homologação"}
              </Badge>
            </div>
            <div
              style={{
                display: "flex",
                gap: 8,
                padding: "10px 12px",
                margin: "4px 0 12px",
                borderRadius: "var(--radius-md)",
                background: "var(--attention-surface)",
                color: "var(--attention)",
                fontSize: 13,
              }}
            >
              A InfoJobs não oferece publicação self-service — a publicação automática
              depende de parceria comercial da Inspect Talent (processo em andamento).
              Preencha o campo desde já — ele será usado assim que a integração for
              aprovada.
            </div>
            <FieldLabel label="Identificador da empresa na InfoJobs" error={fieldErrors.infojobsId}>
              <Input
                disabled={fieldsDisabled}
                value={form.infojobsId ?? ""}
                onChange={(e) => update("infojobsId", e.target.value)}
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
    </div>
  );
}

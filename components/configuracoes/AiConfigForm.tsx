"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EditLockActions, useEditLock } from "@/components/ui/EditLock";
import { FieldLabel, Input, Select } from "@/components/ui/Field";
import { zodFieldErrors } from "@/lib/fieldErrors";
import { updateCompanyAiConfig, testCompanyAiConnection } from "@/app/(dashboard)/configuracoes/actions";
import { companyAiConfigSchema, AI_PROVIDERS, AI_PROVIDER_LABELS, type CompanyAiConfigInput } from "@/schemas/companyAiConfig";
import type { CompanyAiConfigView } from "@/services/companyAiConfig";

// Chave é write-only: a tela NUNCA recebe a chave de verdade, só
// `existing.maskedKey` ("•••• 1234"). Deixar o campo em branco ao salvar
// mantém a chave já configurada (a menos que o provider tenha mudado — aí a
// action exige uma chave nova).
export function AiConfigForm({ existing }: { existing: CompanyAiConfigView | null }) {
  const router = useRouter();
  const initial: CompanyAiConfigInput = {
    provider: existing?.provider ?? "anthropic",
    apiKey: "",
    model: existing?.model ?? "",
    enabled: existing?.enabled ?? true,
  };
  const lock = useEditLock<CompanyAiConfigInput>(initial, Boolean(existing));
  const { values: form, setValues: setForm, locked, fieldErrors } = lock;
  const [submitting, setSubmitting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof CompanyAiConfigInput>(key: K, value: CompanyAiConfigInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) lock.setFieldErrors(({ [key]: _removed, ...rest }) => rest);
    setTestResult(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (locked) return;
    setError(null);

    const check = companyAiConfigSchema.safeParse(form);
    if (!check.success) {
      lock.setFieldErrors(zodFieldErrors(check.error));
      return;
    }

    setSubmitting(true);
    const result = await updateCompanyAiConfig(form);
    setSubmitting(false);

    if ("error" in result) {
      if ("fieldErrors" in result) lock.setFieldErrors(result.fieldErrors);
      else setError(result.error);
      return;
    }

    lock.commit({ ...form, apiKey: "" });
    setTestResult(null);
    router.refresh();
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    const result = await testCompanyAiConnection(form);
    setTesting(false);
    setTestResult(result.success ? { ok: true, message: "Conexão bem-sucedida." } : { ok: false, message: result.error });
  }

  const fieldsDisabled = locked;
  const keyPlaceholder = existing ? `Configurada, terminada em ${existing.maskedKey.replace("•••• ", "")}` : "sk-...";

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Card style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <span className="fin-eyebrow">MINHA IA</span>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>
              Conecte sua própria conta de IA (Anthropic, OpenAI ou Gemini) pra triagem de
              candidatos e análises de desligamento. Sem configurar, o sistema usa a conta
              padrão da plataforma.
            </p>
          </div>
          <Badge tone={existing?.enabled ? "success" : "primary"}>
            {existing ? (existing.enabled ? "Ativo" : "Desativado") : "Usando conta da plataforma"}
          </Badge>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          <FieldLabel label="Provedor" error={fieldErrors.provider}>
            <Select
              disabled={fieldsDisabled}
              value={form.provider}
              onChange={(e) => update("provider", e.target.value as CompanyAiConfigInput["provider"])}
            >
              {AI_PROVIDERS.map((p) => (
                <option key={p} value={p}>
                  {AI_PROVIDER_LABELS[p]}
                </option>
              ))}
            </Select>
          </FieldLabel>
          <FieldLabel label="Modelo" error={fieldErrors.model}>
            <Input
              disabled={fieldsDisabled}
              value={form.model}
              onChange={(e) => update("model", e.target.value)}
              placeholder="ex.: claude-sonnet-4-6"
            />
          </FieldLabel>
        </div>

        <FieldLabel label="Chave de API" error={fieldErrors.apiKey}>
          <Input
            type="password"
            disabled={fieldsDisabled}
            value={form.apiKey}
            onChange={(e) => update("apiKey", e.target.value)}
            placeholder={keyPlaceholder}
            autoComplete="off"
          />
        </FieldLabel>
        {existing && (
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "-8px 0 0" }}>
            Deixe em branco pra manter a chave já salva. Preencha só se quiser trocá-la
            (obrigatório se trocar de provedor).
          </p>
        )}

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
          <input
            type="checkbox"
            disabled={fieldsDisabled}
            checked={form.enabled}
            onChange={(e) => update("enabled", e.target.checked)}
          />
          Usar esta conta pra triagem/análises desta empresa
        </label>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <Button type="button" variant="secondary" onClick={handleTest} disabled={testing}>
            {testing ? "Testando..." : "Testar conexão"}
          </Button>
          {testResult && (
            <span className={testResult.ok ? undefined : "fin-field-error"} style={testResult.ok ? { color: "var(--success)", fontSize: 13 } : undefined}>
              {testResult.message}
            </span>
          )}
        </div>

        {error && <span className="fin-field-error">{error}</span>}

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <EditLockActions
            isExisting={Boolean(existing)}
            locked={locked}
            submitting={submitting}
            createLabel="Salvar"
            onEdit={lock.startEdit}
            onCancel={() => {
              setError(null);
              setTestResult(null);
              lock.cancel();
            }}
          />
        </div>
      </Card>
    </form>
  );
}

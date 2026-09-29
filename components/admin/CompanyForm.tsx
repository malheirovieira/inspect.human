"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Input, Select } from "@/components/ui/Field";
import { createCompanyWithAdmin } from "@/app/actions/adminCompanies";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function CompanyForm({ onCancel, onSaved }: { onCancel: () => void; onSaved: () => void }) {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [companySlug, setCompanySlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [plan, setPlan] = useState("essencial");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // Só preenchido quando o e-mail falha — precisa ser repassado manualmente,
  // então o form fica aberto até o SUPERADMIN copiar (sem fechar sozinho).
  const [failedPassword, setFailedPassword] = useState<string | null>(null);

  function handleNameChange(value: string) {
    setCompanyName(value);
    if (!slugTouched) setCompanySlug(generateSlug(value));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await createCompanyWithAdmin({ companyName, companySlug, adminName, adminEmail, plan });
    setSubmitting(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    router.refresh();

    if (result.emailSent) {
      setSuccess(`Empresa criada! E-mail enviado para ${adminEmail}.`);
      setTimeout(onSaved, 1500);
      return;
    }

    // E-mail falhou (ex.: Resend sem configurar) — a conta já existe e
    // funciona, mas ninguém recebeu a senha. Fica na tela até copiar,
    // não fecha sozinho.
    setFailedPassword(result.tempPassword ?? null);
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <span className="fin-eyebrow">NOVA EMPRESA</span>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          <FieldLabel label="Nome da empresa" required>
            <Input value={companyName} onChange={(e) => handleNameChange(e.target.value)} placeholder="Ex.: Acme Ltda" required />
          </FieldLabel>
          <FieldLabel label="Slug" required>
            <Input
              value={companySlug}
              onChange={(e) => {
                setSlugTouched(true);
                setCompanySlug(e.target.value);
              }}
              placeholder="acme-ltda"
              required
            />
          </FieldLabel>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          <FieldLabel label="Nome do administrador" required>
            <Input value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="Nome completo" required />
          </FieldLabel>
          <FieldLabel label="E-mail do administrador" required>
            <Input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="nome@empresa.com" required />
          </FieldLabel>
          <FieldLabel label="Plano" required>
            <Select value={plan} onChange={(e) => setPlan(e.target.value)}>
              <option value="essencial">Essencial</option>
              <option value="profissional">Profissional</option>
              <option value="corporativo">Corporativo</option>
            </Select>
          </FieldLabel>
        </div>

        {error && <span className="fin-field-error">{error}</span>}
        {success && (
          <div style={{ padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--success-surface)", color: "var(--success)", fontSize: 13, fontWeight: 500 }}>
            {success}
          </div>
        )}
        {failedPassword && (
          <div style={{ padding: "12px 14px", borderRadius: "var(--radius-md)", background: "var(--danger-surface)", color: "var(--danger)", fontSize: 13, display: "flex", flexDirection: "column", gap: 6 }}>
            <strong>Empresa criada, mas o e-mail não pôde ser enviado.</strong>
            <span>Repasse esta senha manualmente para {adminEmail}:</span>
            <code style={{ fontSize: 14, fontWeight: 700, background: "var(--surface)", padding: "6px 10px", borderRadius: "var(--radius-sm)", width: "fit-content" }}>
              {failedPassword}
            </code>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button type="button" variant="secondary" onClick={failedPassword ? onSaved : onCancel} disabled={submitting}>
            {failedPassword ? "Fechar" : "Cancelar"}
          </Button>
          {!failedPassword && (
            <Button type="submit" variant={submitting ? "disabled" : "confirm"}>
              {submitting ? "Criando..." : "Criar e Enviar Acesso"}
            </Button>
          )}
        </div>
      </Card>
    </form>
  );
}

"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Input, Select } from "@/components/ui/Field";
import { TemporaryPasswordCard } from "@/components/ui/TemporaryPasswordCard";
import { inviteUser } from "@/app/(dashboard)/configuracoes/usuarios/actions";
import { INVITE_ROLES, INVITE_ROLE_LABELS } from "@/schemas/userInvite";

type CreatedAccess = { email: string; temporaryPassword: string };

export function InviteUserForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<(typeof INVITE_ROLES)[number]>("EMPLOYEE");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedAccess | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await inviteUser({ name, email, role });

    setSubmitting(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }

    setCreated({ email: result.email, temporaryPassword: result.temporaryPassword });
    setName("");
    setEmail("");
    setRole("EMPLOYEE");
    router.refresh();
  }

  if (created) {
    return (
      <TemporaryPasswordCard
        email={created.email}
        temporaryPassword={created.temporaryPassword}
        dismissLabel="Convidar outro"
        onDismiss={() => setCreated(null)}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <span className="fin-eyebrow">CONVIDAR COLABORADOR</span>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          <FieldLabel label="Nome" required>
            <Input required value={name} onChange={(e) => setName(e.target.value)} />
          </FieldLabel>
          <FieldLabel label="E-mail" required>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </FieldLabel>
          <FieldLabel label="Nível de acesso" required>
            <Select required value={role} onChange={(e) => setRole(e.target.value as (typeof INVITE_ROLES)[number])}>
              {INVITE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {INVITE_ROLE_LABELS[r]}
                </option>
              ))}
            </Select>
          </FieldLabel>
        </div>

        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
          Cria o acesso imediatamente com uma senha temporária — sem enviar e-mail. A ficha completa (CPF, admissão
          etc.) pode ser preenchida depois em Colaboradores.
        </p>

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
            {submitting ? "Criando..." : "Criar acesso"}
          </Button>
        </div>
      </Card>
    </form>
  );
}

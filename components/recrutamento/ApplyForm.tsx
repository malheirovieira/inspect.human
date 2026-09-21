"use client";

import { useState, type FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Input } from "@/components/ui/Field";
import { applyToJob } from "@/app/empresa/[slug]/vagas/[jobId]/actions";

export function ApplyForm({ companySlug, jobId }: { companySlug: string; jobId: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await applyToJob(companySlug, jobId, { name, email, phone, linkedinUrl });

    setSubmitting(false);

    if ("error" in result) {
      setError(result.error);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <Card>
        <p style={{ margin: 0, fontSize: 14 }}>
          Candidatura enviada com sucesso! Nossa equipe vai analisar seu perfil e entrar em contato.
        </p>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="fin-heading" style={{ marginBottom: 0 }}>
          Candidatar-se a esta vaga
        </div>
        <FieldLabel label="Nome completo" required>
          <Input required value={name} onChange={(e) => setName(e.target.value)} />
        </FieldLabel>
        <FieldLabel label="E-mail" required>
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </FieldLabel>
        <FieldLabel label="Telefone">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </FieldLabel>
        <FieldLabel label="LinkedIn">
          <Input placeholder="https://linkedin.com/in/..." value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} />
        </FieldLabel>
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
          O envio de currículo em PDF estará disponível em breve.
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
        <Button type="submit" variant={submitting ? "disabled" : "primary"}>
          {submitting ? "Enviando..." : "Enviar candidatura"}
        </Button>
      </Card>
    </form>
  );
}

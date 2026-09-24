"use client";

import { useState, type FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Input } from "@/components/ui/Field";
import { formatPhone } from "@/lib/phoneMask";
import { applyToJob } from "@/app/empresa/[slug]/vagas/[jobId]/actions";

export function ApplyForm({ companySlug, jobId }: { companySlug: string; jobId: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [resume, setResume] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.set("name", name);
    formData.set("email", email);
    formData.set("phone", phone.replace(/\D/g, ""));
    formData.set("linkedinUrl", linkedinUrl);
    if (resume) formData.set("resume", resume);

    const result = await applyToJob(companySlug, jobId, formData);

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
        <FieldLabel label="Telefone" required>
          <Input
            required
            type="tel"
            placeholder="(11) 91234-5678"
            maxLength={15}
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
          />
        </FieldLabel>
        <FieldLabel label="LinkedIn">
          <Input placeholder="https://linkedin.com/in/..." value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} />
        </FieldLabel>
        <FieldLabel label="Currículo (PDF, até 5MB)">
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setResume(e.target.files?.[0] ?? null)}
            className="fin-input"
            style={{ padding: "9px 14px" }}
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
        <Button type="submit" variant={submitting ? "disabled" : "confirm"}>
          {submitting ? "Enviando..." : "Enviar candidatura"}
        </Button>
      </Card>
    </form>
  );
}

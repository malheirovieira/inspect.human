"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Input, Select } from "@/components/ui/Field";
import { createCandidateManual } from "@/app/(dashboard)/recrutamento/candidatos/actions";

type Job = { id: string; title: string };

export function CandidateManualForm({ jobs, onCreated }: { jobs: Job[]; onCreated?: () => void }) {
  const router = useRouter();
  const [jobId, setJobId] = useState(jobs[0]?.id ?? "");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await createCandidateManual({ jobId, name, email, phone, linkedinUrl });

    setSubmitting(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setName("");
    setEmail("");
    setPhone("");
    setLinkedinUrl("");
    router.refresh();
    onCreated?.();
  }

  if (jobs.length === 0) {
    return (
      <Card>
        <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)" }}>
          Crie uma vaga primeiro para poder cadastrar candidatos.
        </p>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <span className="fin-eyebrow">CADASTRAR CANDIDATO</span>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          <FieldLabel label="Vaga" required>
            <Select required value={jobId} onChange={(e) => setJobId(e.target.value)}>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                </option>
              ))}
            </Select>
          </FieldLabel>
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
        </div>

        {error && (
          <div style={{ padding: "12px 16px", borderRadius: "var(--radius-md)", background: "var(--danger-surface)", color: "var(--danger)", fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button type="submit" variant={submitting ? "disabled" : "primary"}>
            {submitting ? "Salvando..." : "Cadastrar candidato"}
          </Button>
        </div>
      </Card>
    </form>
  );
}

"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Input, Select, Textarea } from "@/components/ui/Field";
import { createJob, updateJob } from "@/app/(dashboard)/recrutamento/vagas/actions";
import type { JobInput } from "@/schemas/job";

const INITIAL: JobInput = {
  title: "",
  description: "",
  department: "",
  location: "",
  workMode: "PRESENCIAL",
  employmentType: "",
  resumeDeadline: "",
  interviewDeadline: "",
  hiringDeadline: "",
  expectedStartDate: "",
};

export function JobForm({
  jobId,
  initial,
  employmentTypeOptions = [],
  departmentOptions = [],
}: {
  jobId?: string;
  initial?: JobInput;
  employmentTypeOptions?: string[];
  departmentOptions?: string[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<JobInput>(initial ?? INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Card de detalhes de uma vaga existente abre bloqueado (cinza, somente
  // leitura) pra evitar edição sem querer — "Editar" destrava os campos,
  // "Atualizar" salva e trava de novo. Vaga nova (sem jobId) não bloqueia:
  // não faz sentido travar um formulário em branco.
  const [locked, setLocked] = useState(Boolean(jobId));

  function update<K extends keyof JobInput>(key: K, value: JobInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (jobId && locked) {
      setLocked(false);
      return;
    }

    setSubmitting(true);
    setError(null);

    const result = jobId ? await updateJob(jobId, form) : await createJob(form);

    setSubmitting(false);

    if (result && "error" in result) {
      setError(result.error);
      return;
    }

    if (jobId) {
      setLocked(true);
      router.refresh();
    }
    // createJob redireciona no servidor (redirect()), não precisa navegar aqui.
  }

  const fieldsDisabled = jobId ? locked : false;

  return (
    <form onSubmit={handleSubmit}>
      <Card style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
          <FieldLabel label="Título da vaga" required>
            <Input required disabled={fieldsDisabled} value={form.title} onChange={(e) => update("title", e.target.value)} />
          </FieldLabel>
          <FieldLabel label="Setor">
            <Select disabled={fieldsDisabled} value={form.department} onChange={(e) => update("department", e.target.value)}>
              <option value="">Selecione</option>
              {departmentOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </FieldLabel>
          <FieldLabel label="Localização">
            <Input disabled={fieldsDisabled} value={form.location} onChange={(e) => update("location", e.target.value)} />
          </FieldLabel>
          <FieldLabel label="Modelo de trabalho" required>
            <Select
              required
              disabled={fieldsDisabled}
              value={form.workMode}
              onChange={(e) => update("workMode", e.target.value as JobInput["workMode"])}
            >
              <option value="PRESENCIAL">Presencial</option>
              <option value="REMOTO">Remoto</option>
              <option value="HIBRIDO">Híbrido</option>
            </Select>
          </FieldLabel>
          <FieldLabel label="Tipo de contratação">
            <Select disabled={fieldsDisabled} value={form.employmentType} onChange={(e) => update("employmentType", e.target.value)}>
              <option value="">Selecione</option>
              {employmentTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </FieldLabel>
        </div>

        <FieldLabel label="Descrição da vaga" required>
          <Textarea
            required
            disabled={fieldsDisabled}
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            style={{ minHeight: 160 }}
          />
        </FieldLabel>

        <div>
          <span className="fin-eyebrow">CRONOGRAMA</span>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 12px" }}>
            Datas de referência pro processo — nada fecha automaticamente quando elas passam.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            <FieldLabel label="Encerrar recebimento de currículos">
              <Input
                type="date"
                disabled={fieldsDisabled}
                value={form.resumeDeadline}
                onChange={(e) => update("resumeDeadline", e.target.value)}
              />
            </FieldLabel>
            <FieldLabel label="Encerrar entrevistas">
              <Input
                type="date"
                disabled={fieldsDisabled}
                value={form.interviewDeadline}
                onChange={(e) => update("interviewDeadline", e.target.value)}
              />
            </FieldLabel>
            <FieldLabel label="Encerrar contratação (envio de documentos)">
              <Input
                type="date"
                disabled={fieldsDisabled}
                value={form.hiringDeadline}
                onChange={(e) => update("hiringDeadline", e.target.value)}
              />
            </FieldLabel>
            <FieldLabel label="Previsão de início">
              <Input
                type="date"
                disabled={fieldsDisabled}
                value={form.expectedStartDate}
                onChange={(e) => update("expectedStartDate", e.target.value)}
              />
            </FieldLabel>
          </div>
        </div>

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
          <Button type="submit" variant={submitting ? "disabled" : "primary"}>
            {submitting
              ? "Salvando..."
              : !jobId
                ? "Criar vaga"
                : locked
                  ? "Editar"
                  : "Atualizar"}
          </Button>
        </div>
      </Card>
    </form>
  );
}

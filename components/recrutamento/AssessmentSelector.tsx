"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, Copy } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { generateDiscLink } from "@/lib/actions/generateDiscLink";
import { generateQuizLink } from "@/lib/actions/generateQuizLink";
import type { AssessmentOption } from "@/services/assessments";

// Seletor + envio de avaliação (DISC ou Quiz) pra candidatura — generaliza o
// antigo DiscSection.tsx, que só sabia enviar a avaliação DISC padrão.
// Permite enviar mais de uma avaliação pro mesmo candidato (cada uma com seu
// próprio link/token — migration 0036 trocou o unique de DiscResponse pra
// [applicationId, assessmentId] justamente pra isso).
export function AssessmentSelector({ applicationId, options }: { applicationId: string; options: AssessmentOption[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState(options[0] ? `${options[0].type}:${options[0].id}` : "");
  const [generating, setGenerating] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (options.length === 0) {
    return (
      <Card style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span className="fin-eyebrow">AVALIAÇÕES</span>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
          Nenhuma avaliação ativa cadastrada. Crie uma em "Avaliações" no menu.
        </p>
      </Card>
    );
  }

  async function handleSend() {
    const [type, id] = selected.split(":");
    setGenerating(true);
    setError(null);
    setLink(null);

    const result =
      type === "DISC" ? await generateDiscLink(applicationId, id) : await generateQuizLink(applicationId, id);
    setGenerating(false);

    if (!result.success) {
      setError(result.error);
      return;
    }
    setLink(`${window.location.origin}/avaliacao/${result.token}`);
    router.refresh();
  }

  function handleCopy() {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <span className="fin-eyebrow">ENVIAR AVALIAÇÃO</span>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Select value={selected} onChange={(e) => setSelected(e.target.value)} style={{ flex: 1, minWidth: 200 }}>
          {options.map((o) => (
            <option key={`${o.type}:${o.id}`} value={`${o.type}:${o.id}`}>
              {o.title}
            </option>
          ))}
        </Select>
        <Button type="button" variant="secondary" onClick={handleSend} disabled={generating}>
          <ClipboardCheck size={16} />
          {generating ? "Gerando..." : "Enviar"}
        </Button>
      </div>

      {error && <span className="fin-field-error">{error}</span>}

      {link && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: 12,
            borderRadius: "var(--radius-md)",
            background: "var(--surface-muted)",
          }}
        >
          <code style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{link}</code>
          <Button type="button" variant="secondary" onClick={handleCopy}>
            <Copy size={14} />
            {copied ? "Copiado!" : "Copiar Link"}
          </Button>
        </div>
      )}
    </Card>
  );
}

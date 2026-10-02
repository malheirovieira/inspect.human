"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, Copy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { generateExitSurveyLink } from "@/lib/actions/generateExitSurveyLink";

// Mesmo padrão de AssessmentSelector.tsx: gera o link sob demanda (reaproveita
// token existente se já houver um em aberto) e oferece copiar em seguida.
export function ExitSurveyLinkButton({ employeeExitId, alreadySubmitted }: { employeeExitId: string; alreadySubmitted: boolean }) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (alreadySubmitted) {
    return <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Pesquisa respondida</span>;
  }

  async function handleSend() {
    setGenerating(true);
    setError(null);
    const result = await generateExitSurveyLink(employeeExitId);
    setGenerating(false);

    if (!result.success) {
      setError(result.error);
      return;
    }
    setLink(`${window.location.origin}/pesquisa-saida/${result.token}`);
    router.refresh();
  }

  function handleCopy() {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (link) {
    return (
      <Button type="button" variant="secondary" onClick={handleCopy}>
        <Copy size={14} />
        {copied ? "Copiado!" : "Copiar link"}
      </Button>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
      <Button type="button" variant="secondary" onClick={handleSend} disabled={generating}>
        <ClipboardCheck size={14} />
        {generating ? "Gerando..." : "Enviar pesquisa"}
      </Button>
      {error && <span className="fin-field-error">{error}</span>}
    </div>
  );
}

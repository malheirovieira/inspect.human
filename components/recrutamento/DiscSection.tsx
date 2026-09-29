"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DiscResponse } from "@prisma/client";
import { ClipboardCheck, Copy } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { generateDiscLink } from "@/lib/actions/generateDiscLink";
import { COMPETENCIA_DIMENSIONS, DISC_DIMENSIONS, DISC_DIMENSION_LABELS } from "@/lib/disc/questions";

function competenciaScores(r: DiscResponse): Record<(typeof COMPETENCIA_DIMENSIONS)[number], number> {
  return {
    Energia: Number(r.scoreEnergia ?? 0),
    Responsabilidade: Number(r.scoreResponsabilidade ?? 0),
    Engajamento: Number(r.scoreEngajamento ?? 0),
    "Trabalho em Equipe": Number(r.scoreTrabalhoEquipe ?? 0),
    Comprometimento: Number(r.scoreComprometimento ?? 0),
    "Facilidade de Aprendizagem": Number(r.scoreAprendizagem ?? 0),
  };
}

function discScores(r: DiscResponse): Record<(typeof DISC_DIMENSIONS)[number], number> {
  return { D: Number(r.scoreD ?? 0), I: Number(r.scoreI ?? 0), S: Number(r.scoreS ?? 0), C: Number(r.scoreC ?? 0) };
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
        <span style={{ color: "var(--ink)" }}>{label}</span>
        <span style={{ fontWeight: 600, color: "var(--ink)" }}>{score.toFixed(1)}/100</span>
      </div>
      <div style={{ height: 8, background: "var(--surface-muted)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${Math.min(score, 100)}%`,
            background: "var(--action-confirm)",
            borderRadius: "var(--radius-full)",
          }}
        />
      </div>
    </div>
  );
}

// Estado logo após gerar o link, antes do refresh trazer o registro
// completo do banco — só o suficiente pra já mostrar o link copiável.
type PendingLink = { token: string; submittedAt: null; expiresAt: Date };

export function DiscSection({
  applicationId,
  response,
}: {
  applicationId: string;
  response: DiscResponse | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<PendingLink | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current: DiscResponse | PendingLink | null = response ?? pending;

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    const result = await generateDiscLink(applicationId);
    setGenerating(false);

    if (!result.success) {
      setError(result.error);
      return;
    }
    setPending({ token: result.token!, submittedAt: null, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });
    router.refresh();
  }

  function handleCopy() {
    if (!current) return;
    const url = `${window.location.origin}/avaliacao/${current.token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!current) {
    return (
      <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <span className="fin-eyebrow">DISC</span>
        <p style={{ fontSize: 14, color: "var(--text-muted)", margin: 0 }}>Avaliação DISC não enviada.</p>
        {error && <p style={{ fontSize: 13, color: "var(--danger)", margin: 0 }}>{error}</p>}
        <div>
          <Button type="button" variant="secondary" onClick={handleGenerate} disabled={generating}>
            <ClipboardCheck size={16} />
            {generating ? "Gerando..." : "Gerar Link DISC"}
          </Button>
        </div>
      </Card>
    );
  }

  if (!current.submittedAt) {
    const daysLeft = Math.max(0, Math.ceil((new Date(current.expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
    return (
      <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <span className="fin-eyebrow">DISC</span>
        <p style={{ fontSize: 14, color: "var(--text-muted)", margin: 0 }}>
          Aguardando resposta — expira em {daysLeft} {daysLeft === 1 ? "dia" : "dias"}.
        </p>
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
          <code style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            /avaliacao/{current.token}
          </code>
          <Button type="button" variant="secondary" onClick={handleCopy}>
            <Copy size={14} />
            {copied ? "Copiado!" : "Copiar Link"}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span className="fin-eyebrow">DISC</span>
        <span
          style={{
            padding: "4px 12px",
            borderRadius: "var(--radius-full)",
            background: "var(--success-surface)",
            color: "var(--success)",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Perfil {current.perfilDisc}
        </span>
      </div>

      <div style={{ textAlign: "center", padding: "8px 0" }}>
        <div style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Índice Geral
        </div>
        <div style={{ fontSize: 32, fontWeight: 700, color: "var(--ink)" }}>{Number(current.scoreGeral).toFixed(0)}/100</div>
        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{current.nivelGeral}</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
          Competências
        </span>
        {COMPETENCIA_DIMENSIONS.map((dim) => (
          <ScoreBar key={dim} label={dim} score={competenciaScores(current)[dim]} />
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
          Perfil DISC
        </span>
        {DISC_DIMENSIONS.map((dim) => (
          <ScoreBar key={dim} label={DISC_DIMENSION_LABELS[dim]} score={discScores(current)[dim]} />
        ))}
      </div>
    </Card>
  );
}

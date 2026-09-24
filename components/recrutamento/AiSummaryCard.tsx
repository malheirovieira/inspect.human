"use client";

import { useState, useTransition, type ReactNode } from "react";
import { AlertCircle, FileWarning, Info, Loader2, RefreshCw, Sparkles, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AutoRefresh } from "@/components/ui/AutoRefresh";
import { SkillTagsEditor } from "./SkillTagsEditor";
import { requestCandidateAnalysis } from "@/app/(dashboard)/recrutamento/banco-de-talentos/aiActions";
import type { ProfileAiState } from "@/services/resumeAnalyses";

// Card "Resumo do currículo" no perfil da pessoa, ACIMA do currículo.
// Apoio à triagem: nunca decide nada — o rótulo lembra de revisar. Textos de
// quando a ferramenta não roda falam da FERRAMENTA, nunca do candidato
// (nunca "elegível"). Recebe só dados serializáveis.

const FAILURE_TEXT: Record<string, string> = {
  INVALID_PDF: "O arquivo PDF não pôde ser lido. Envie uma nova versão do currículo.",
  DOWNLOAD: "Não foi possível ler o arquivo do currículo.",
  CONFIG: "A configuração da IA está incompleta — fale com o administrador do sistema.",
  PROVIDER: "O serviço de IA não respondeu.",
  INVALID_OUTPUT: "A resposta da IA veio fora do formato esperado.",
};

const dateFormat = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });

function formatYears(years: number): string {
  if (years < 1) return "menos de 1 ano";
  const rounded = Number.isInteger(years) ? String(years) : years.toFixed(1).replace(".", ",");
  return `${rounded} ${years === 1 ? "ano" : "anos"}`;
}

export function AiSummaryCard({ candidateId, state }: { candidateId: string; state: ProfileAiState }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmingOverwrite, setConfirmingOverwrite] = useState(false);

  if (!state.hasResume) return null;
  const { analysis, blockedLabel } = state;

  function generate(keepEditedSkills?: boolean) {
    setError(null);
    setConfirmingOverwrite(false);
    startTransition(async () => {
      const result = await requestCandidateAnalysis(candidateId, { keepEditedSkills });
      if ("error" in result) setError(result.error);
    });
  }

  const muted = { fontSize: 13, color: "var(--text-muted)", margin: 0 } as const;
  const isMock = analysis?.isMock ?? false;

  // Botão de gerar — escondido quando a ferramenta não pode rodar agora.
  const generateButton = (label: string) =>
    blockedLabel ? null : (
      <Button
        type="button"
        variant={pending ? "disabled" : "secondary"}
        onClick={() => (analysis?.status === "DONE" && analysis.skillsEdited ? setConfirmingOverwrite(true) : generate())}
      >
        <RefreshCw size={14} /> {pending ? "Enviando..." : label}
      </Button>
    );

  let body: ReactNode;
  let action: ReactNode = null;

  if (!analysis || analysis.status === "SKIPPED") {
    body = blockedLabel ? (
      <p style={{ ...muted, display: "flex", alignItems: "center", gap: 8 }}>
        <Info size={15} /> {blockedLabel}
      </p>
    ) : (
      <p style={muted}>Nenhum resumo gerado para este currículo ainda.</p>
    );
    action = generateButton("Gerar resumo");
  } else if (analysis.status === "PROCESSING") {
    body = (
      <p style={{ ...muted, display: "flex", alignItems: "center", gap: 8 }}>
        <Loader2 size={15} className="animate-spin" /> Processando o currículo…
        <AutoRefresh />
      </p>
    );
  } else if (analysis.status === "NO_TEXT") {
    body = (
      <p style={{ ...muted, display: "flex", alignItems: "flex-start", gap: 8 }}>
        <FileWarning size={15} style={{ flexShrink: 0, marginTop: 2 }} />
        Sem texto legível — o PDF parece ser digitalizado (imagem). Envie uma versão do currículo com texto para gerar o resumo.
      </p>
    );
  } else if (analysis.status === "FAILED") {
    body = (
      <p style={{ ...muted, display: "flex", alignItems: "flex-start", gap: 8 }}>
        <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 2, color: "var(--danger)" }} />
        <span>
          Falhou ao gerar o resumo. {FAILURE_TEXT[analysis.errorCode ?? ""] ?? ""}
        </span>
      </p>
    );
    // PDF ilegível: tentar de novo não resolve — só uma versão nova.
    if (analysis.errorCode !== "INVALID_PDF") action = generateButton("Tentar novamente");
  } else {
    const r = analysis.result;
    body = r && (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <p style={{ fontSize: 14, lineHeight: 1.55, margin: 0, color: "var(--text-primary)" }}>{r.resumo}</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
          <div>
            <div className="fin-eyebrow">EXPERIÊNCIA</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>
              {r.experienciaAnos === null ? "Não informada" : formatYears(r.experienciaAnos)}
            </div>
            {r.experienciaBase && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{r.experienciaBase}</div>}
          </div>
          <div>
            <div className="fin-eyebrow">FORMAÇÃO</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{r.formacao ?? "Não informada"}</div>
          </div>
          <div>
            <div className="fin-eyebrow">ÚLTIMOS CARGOS</div>
            {r.ultimosCargos.length === 0 ? (
              <div style={{ fontSize: 14, marginTop: 2, color: "var(--text-muted)" }}>Não informados</div>
            ) : (
              <ul style={{ margin: "2px 0 0", padding: 0, listStyle: "none", fontSize: 13, display: "flex", flexDirection: "column", gap: 2 }}>
                {r.ultimosCargos.map((c, i) => (
                  <li key={i}>
                    <span style={{ fontWeight: 600 }}>{c.cargo}</span>
                    {c.empresa && <span style={{ color: "var(--text-muted)" }}> · {c.empresa}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div>
          <div className="fin-eyebrow" style={{ marginBottom: 6 }}>
            COMPETÊNCIAS
          </div>
          <SkillTagsEditor analysisId={analysis.id} initial={analysis.skills} edited={analysis.skillsEdited} />
        </div>
      </div>
    );
    action = generateButton("Gerar novamente");
  }

  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <span className="fin-eyebrow">RESUMO DO CURRÍCULO</span>
          {analysis?.status === "DONE" && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
              <Sparkles size={12} />
              {isMock ? "Exemplo simulado · sem IA" : "Gerado por IA · revise antes de decidir"}
              {analysis.completedAt && ` · ${dateFormat.format(new Date(analysis.completedAt))}`}
            </div>
          )}
        </div>
        {!confirmingOverwrite && action}
      </div>

      {confirmingOverwrite && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            padding: "12px 14px",
            borderRadius: "var(--radius-md)",
            background: "var(--surface-muted)",
          }}
        >
          <span style={{ fontSize: 13 }}>Você editou as tags deste resumo. Na nova geração:</span>
          <div style={{ display: "flex", gap: 8 }}>
            <Button type="button" variant="icon-cancel" onClick={() => setConfirmingOverwrite(false)} aria-label="Cancelar" title="Cancelar">
              <X size={18} />
            </Button>
            <Button type="button" variant="danger" onClick={() => generate(false)}>
              Usar as tags da IA
            </Button>
            <Button type="button" variant="confirm" onClick={() => generate(true)}>
              Manter minhas tags
            </Button>
          </div>
        </div>
      )}

      {body}
      {error && <span className="fin-field-error">{error}</span>}
    </Card>
  );
}

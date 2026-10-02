import { ArrowDown, ArrowRight, ArrowUp, Minus } from "lucide-react";
import { SectionLabel } from "@/components/ui/SectionLabel";
import {
  classifyTrend,
  LEADER_CLASSIFICATION_LABELS,
  LEADER_THRESHOLDS,
  type LeaderClassification,
  type Trend,
} from "@/lib/desligamentos/exitAnalysis";

export function fmtPct(value: number | null): string {
  return value === null ? "—" : `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

function fmtPoints(delta: number): string {
  const sign = delta > 0 ? "+" : delta < 0 ? "−" : "±";
  return `${sign}${Math.abs(delta).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} p.p.`;
}

// KPI do resumo executivo: rótulo pequeno, número grande, comparação
// "antes → agora" discreta embaixo. `featured` = fundo escuro da marca, pro
// número que abre o relatório.
export function HeadlineStat({
  label,
  value,
  previous,
  delta,
  support,
  featured,
}: {
  label: string;
  value: string;
  previous?: string;
  delta?: string;
  support?: string;
  featured?: boolean;
}) {
  return (
    <div className={`fin-headline${featured ? " fin-headline--featured" : ""}`}>
      <SectionLabel>{label}</SectionLabel>
      <div className="fin-headline__value">{value}</div>
      {previous !== undefined && (
        <span className="fin-headline__compare">
          {previous}
          <ArrowRight size={13} aria-label="para" />
          {value}
          {delta && <span className="fin-headline__delta">({delta})</span>}
        </span>
      )}
      {support && <span className="fin-headline__support">{support}</span>}
    </div>
  );
}

export function pctComparison(current: number | null, previous: number | null | undefined) {
  if (previous === undefined || previous === null || current === null) return { previous: undefined, delta: undefined };
  return { previous: fmtPct(previous), delta: fmtPoints(current - previous) };
}

export function countComparison(current: number, previous: number | undefined) {
  if (previous === undefined) return { previous: undefined, delta: undefined };
  const diff = current - previous;
  return { previous: String(previous), delta: `${diff > 0 ? "+" : diff < 0 ? "−" : "±"}${Math.abs(diff)}` };
}

const TREND_PILL: Record<Exclude<Trend, "SEM_DADOS">, { className: string; label: string; Icon: typeof ArrowUp }> = {
  MELHOROU: { className: "fin-pill--success", label: "Melhorou", Icon: ArrowUp },
  PIOROU: { className: "fin-pill--danger", label: "Piorou", Icon: ArrowDown },
  ESTAVEL: { className: "fin-pill--muted", label: "Estável", Icon: Minus },
};

export function TrendPill({ trend }: { trend: Trend }) {
  if (trend === "SEM_DADOS") return <span style={{ fontSize: 12, color: "var(--text-muted)" }}>—</span>;
  const { className, label, Icon } = TREND_PILL[trend];
  return (
    <span className={`fin-pill ${className}`}>
      <Icon size={12} aria-hidden />
      {label}
    </span>
  );
}

export function PerceptionHead({ hasPrevious }: { hasPrevious: boolean }) {
  return (
    <div className="fin-perception-head">
      <span>Dimensão</span>
      <span>Período atual</span>
      <span style={{ textAlign: "right" }}>{hasPrevious ? "Anterior" : ""}</span>
      <span style={{ textAlign: "right" }}>{hasPrevious ? "Tendência" : ""}</span>
    </div>
  );
}

export function PerceptionRow({
  label,
  current,
  previous,
}: {
  label: string;
  current: number | null;
  previous: number | null | undefined;
}) {
  const hasPrevious = previous !== undefined;
  const { trend } = classifyTrend(current, previous ?? null);
  return (
    <div className="fin-perception-row">
      <span>{label}</span>
      <div className="fin-perception-bar" aria-label={`${label}: ${fmtPct(current)}`}>
        <div className="fin-perception-bar__fill" style={{ width: `${Math.max(0, Math.min(100, current ?? 0))}%` }} />
        <span className="fin-perception-bar__value">{fmtPct(current)}</span>
      </div>
      <span className="fin-perception-prev">
        {hasPrevious && (
          <>
            {/* Só aparece no celular, onde o cabeçalho da coluna some. */}
            <span className="fin-perception-prev__label">Anterior: </span>
            {fmtPct(previous ?? null)}
          </>
        )}
      </span>
      <span className="fin-perception-trend">{hasPrevious ? <TrendPill trend={trend} /> : null}</span>
    </div>
  );
}

const LEADER_PILL_CLASS: Record<LeaderClassification, string> = {
  PRIORIDADE: "fin-pill--danger",
  ATENCAO: "fin-pill--attention",
  ACOMPANHAR: "fin-pill--neutral",
  REFERENCIA: "fin-pill--success",
};

export function LeaderPill({ classification }: { classification: LeaderClassification }) {
  return (
    <span className={`fin-pill ${LEADER_PILL_CLASS[classification]}`}>
      <span className="fin-pill__dot" aria-hidden />
      {LEADER_CLASSIFICATION_LABELS[classification]}
    </span>
  );
}

const t = LEADER_THRESHOLDS;
const LEADER_LEGEND: { classification: LeaderClassification; text: string }[] = [
  {
    classification: "PRIORIDADE",
    text: `relação positiva abaixo de ${t.priority.relationshipBelow}%, ou ${t.priority.notRecommendAtLeast}%+ não recomendaria, ou ${t.priority.controllableAtLeast}%+ das saídas por motivo controlável`,
  },
  {
    classification: "ATENCAO",
    text: `relação positiva abaixo de ${t.attention.relationshipBelow}% ou ${t.attention.notRecommendAtLeast}%+ não recomendaria`,
  },
  { classification: "ACOMPANHAR", text: "dentro do esperado" },
  {
    classification: "REFERENCIA",
    text: `relação positiva de ${t.reference.relationshipAtLeast}%+ e até ${t.reference.notRecommendAtMost}% não recomendaria`,
  },
];

export function LeaderLegend() {
  return (
    <div className="fin-legend">
      {LEADER_LEGEND.map((item) => (
        <span key={item.classification} className="fin-legend__item">
          <LeaderPill classification={item.classification} />
          {item.text}
        </span>
      ))}
    </div>
  );
}

"use client";

import { useEffect, useState, type ReactNode } from "react";
import { BarChart3, PieChart as PieIcon } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
} from "recharts";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { buildCategorySeries, type CategoryInput, type CategorySeriesRow } from "@/lib/desligamentos/chartSeries";

export const CHART_PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
];

const AXIS_TICK = { fontSize: 12, fill: "var(--text-muted)" };

function fmtPct(value: number): string {
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

function truncate(label: string, max: number): string {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}

// Tela estreita (celular): eixo de rótulos mais curto pra sobrar barra.
function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const update = () => setNarrow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return narrow;
}

// Rótulo do eixo de categorias em UMA linha (o recharts quebra em várias e
// corta no meio) — truncado pela largura do eixo, texto completo no <title>
// (aparece no hover nativo do navegador).
function categoryTick(axisWidth: number) {
  const maxChars = Math.max(10, Math.floor((axisWidth - 10) / 6.4));
  function CategoryTick(props: { x?: number | string; y?: number | string; payload?: { value?: unknown } }) {
    const full = String(props.payload?.value ?? "");
    return (
      <text x={Number(props.x)} y={Number(props.y)} dy={4} textAnchor="end" fontSize={12} fill="var(--text-secondary)">
        <title>{full}</title>
        {truncate(full, maxChars)}
      </text>
    );
  }
  return CategoryTick;
}

// Tooltip do recharts v3 chega com payload genérico — só lemos o `payload`
// original da linha, que é sempre um objeto nosso.
type TooltipArgs = { active?: boolean; payload?: ReadonlyArray<{ payload?: unknown }> };

function firstRow<T>(args: TooltipArgs): T | null {
  if (!args.active || !args.payload || args.payload.length === 0) return null;
  return (args.payload[0].payload as T) ?? null;
}

export function ReportCard({
  label,
  title,
  hint,
  action,
  children,
  className,
}: {
  label: string;
  title?: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`fin-card fin-report-card${className ? ` ${className}` : ""}`}>
      <div className="fin-report-card__head">
        <div>
          <SectionLabel>{label}</SectionLabel>
          {title && <h2 className="fin-report-card__title">{title}</h2>}
        </div>
        {action}
      </div>
      {hint && <p className="fin-report-card__hint">{hint}</p>}
      {children}
    </section>
  );
}

export function EmptyChart({ children }: { children: ReactNode }) {
  return <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>{children}</p>;
}

// Legenda em HTML (fora do SVG): não herda a cor da série no texto, segue a
// ordem do dado e não se desloca quando o gráfico é reescalado na impressão.
function ChartLegend({ items }: { items: { label: string; color: string; value?: string }[] }) {
  return (
    <ul className="fin-chart-legend">
      {items.map((item) => (
        <li key={item.label} title={item.label}>
          <span className="fin-chart-legend__dot" style={{ background: item.color }} aria-hidden />
          <span className="fin-chart-legend__label">{item.label}</span>
          {item.value && <span className="fin-chart-legend__value">{item.value}</span>}
        </li>
      ))}
    </ul>
  );
}

export function MonthlyVolumeChart({ data }: { data: { label: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 20, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--divider)" />
        <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
        <Tooltip
          cursor={{ fill: "var(--accent-surface)" }}
          content={(args: TooltipArgs) => {
            const row = firstRow<{ label: string; count: number }>(args);
            if (!row) return null;
            return (
              <div className="fin-chart-tooltip">
                <strong>{row.label}</strong>
                {row.count} desligamento(s)
              </div>
            );
          }}
        />
        <Bar dataKey="count" fill="var(--chart-1)" radius={[6, 6, 0, 0]} maxBarSize={40}>
          <LabelList dataKey="count" position="top" style={{ fontSize: 11, fill: "var(--text-muted)" }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

type ComparisonRow = { label: string; atual: number; anterior: number | null };

// Comparação entre dois períodos fica SEMPRE em barra — pizza não compara
// duas séries lado a lado.
export function ReasonComparisonChart({ data }: { data: ComparisonRow[] }) {
  const narrow = useNarrow();
  const axisWidth = narrow ? 110 : 160;
  const height = Math.max(200, data.length * 52);
  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 48, left: 0, bottom: 0 }} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--divider)" />
          <XAxis type="number" unit="%" tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="label" width={axisWidth} tick={categoryTick(axisWidth)} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: "var(--accent-surface)" }}
            content={(args: TooltipArgs) => {
              const row = firstRow<ComparisonRow>(args);
              if (!row) return null;
              return (
                <div className="fin-chart-tooltip">
                  <strong>{row.label}</strong>
                  Período atual: {fmtPct(row.atual)}
                  {row.anterior !== null && (
                    <>
                      <br />
                      Período anterior: {fmtPct(row.anterior)}
                    </>
                  )}
                </div>
              );
            }}
          />
          <Bar dataKey="atual" name="Período atual" fill="var(--chart-1)" radius={[0, 6, 6, 0]} maxBarSize={18}>
            <LabelList dataKey="atual" position="right" formatter={(v) => fmtPct(Number(v))} style={{ fontSize: 11, fill: "var(--text-secondary)" }} />
          </Bar>
          <Bar dataKey="anterior" name="Período anterior" fill="var(--chart-3)" radius={[0, 6, 6, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
      <ChartLegend
        items={[
          { label: "Período atual", color: "var(--chart-1)" },
          { label: "Período anterior", color: "var(--chart-3)" },
        ]}
      />
    </div>
  );
}

function CategoryTooltip({ row, pctBase }: { row: CategorySeriesRow; pctBase: string }) {
  return (
    <div className="fin-chart-tooltip">
      <strong>{row.category}</strong>
      {row.count} {row.count === 1 ? "menção" : "menções"}
      {row.pct !== null && (
        <>
          <br />
          {fmtPct(row.pct)} {pctBase}
        </>
      )}
      <br />
      {fmtPct(row.share)} do total de menções
      {row.otherCategories > 0 && (
        <>
          <br />
          Soma de {row.otherCategories} categorias menores
        </>
      )}
    </div>
  );
}

export type ChartKind = "bar" | "pie";

export function ChartToggle({ value, onChange }: { value: ChartKind; onChange: (kind: ChartKind) => void }) {
  return (
    <div className="fin-chart-toggle no-print" role="group" aria-label="Tipo de gráfico">
      <button type="button" aria-pressed={value === "bar"} aria-label="Barras" title="Barras" onClick={() => onChange("bar")}>
        <BarChart3 size={15} />
      </button>
      <button type="button" aria-pressed={value === "pie"} aria-label="Pizza" title="Pizza" onClick={() => onChange("pie")}>
        <PieIcon size={15} />
      </button>
    </div>
  );
}

// Card com gráfico de categoria ÚNICA (um período só) e alternância
// barra/pizza. As duas visualizações desenham a mesma série
// (buildCategorySeries) e usam o mesmo tooltip. O estado do toggle é local
// ao card: o que está na tela é o que sai no PDF (window.print).
export function CategoryChartCard({
  label,
  title,
  items,
  pctBase,
  emptyText = "Sem respostas com esse campo preenchido.",
}: {
  label: string;
  title?: string;
  items: CategoryInput[];
  pctBase: string;
  emptyText?: string;
}) {
  const [kind, setKind] = useState<ChartKind>("bar");
  const rows = buildCategorySeries(items);
  const hint =
    rows.length === 0
      ? undefined
      : kind === "bar"
        ? `Barra: % ${pctBase}. Passe o mouse para ver contagem e participação.`
        : "Pizza: participação de cada item no total de menções. Passe o mouse para ver o detalhe.";

  return (
    <ReportCard
      label={label}
      title={title}
      hint={hint}
      action={rows.length > 0 ? <ChartToggle value={kind} onChange={setKind} /> : undefined}
    >
      {rows.length === 0 ? <EmptyChart>{emptyText}</EmptyChart> : <CategoryChartBody rows={rows} kind={kind} pctBase={pctBase} />}
    </ReportCard>
  );
}

function CategoryChartBody({ rows, kind, pctBase }: { rows: CategorySeriesRow[]; kind: ChartKind; pctBase: string }) {
  const narrow = useNarrow();
  const axisWidth = narrow ? 110 : 180;
  const tooltip = (
    <Tooltip
      cursor={{ fill: "var(--accent-surface)" }}
      content={(args: TooltipArgs) => {
        const row = firstRow<CategorySeriesRow>(args);
        return row ? <CategoryTooltip row={row} pctBase={pctBase} /> : null;
      }}
    />
  );

  if (kind === "pie") {
    return (
      <div className="fin-pie-layout">
        <div className="fin-pie-layout__chart">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={rows}
                dataKey="count"
                nameKey="category"
                innerRadius="55%"
                outerRadius="90%"
                paddingAngle={1.5}
                stroke="var(--surface)"
                strokeWidth={2}
                isAnimationActive={false}
              >
                {rows.map((row, i) => (
                  <Cell key={row.category} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                ))}
              </Pie>
              {tooltip}
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ChartLegend
          items={rows.map((row, i) => ({
            label: row.category,
            color: CHART_PALETTE[i % CHART_PALETTE.length],
            value: fmtPct(row.share),
          }))}
        />
      </div>
    );
  }

  const barLabel = (r: CategorySeriesRow) => (r.pct !== null ? fmtPct(r.pct) : String(r.count));

  // Celular: no eixo do recharts os rótulos seriam truncados a ponto de
  // ficarem ilegíveis — mesma série, desenhada como lista com o rótulo
  // inteiro acima de cada barra.
  if (narrow) {
    const max = Math.max(...rows.map((r) => r.count));
    return (
      <ul className="fin-hbar-list">
        {rows.map((r, i) => (
          <li key={r.category}>
            <div className="fin-hbar-list__head">
              <span className="fin-hbar-list__label">{r.category}</span>
              <span className="fin-hbar-list__value">{barLabel(r)}</span>
            </div>
            <div className="fin-hbar-list__track">
              <div
                className="fin-hbar-list__fill"
                style={{ width: `${(r.count / max) * 100}%`, background: i === 0 ? "var(--chart-1)" : "var(--chart-2)" }}
              />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="fin-category-chart">
    <ResponsiveContainer width="100%" height={Math.max(180, rows.length * 38)}>
      <BarChart
        data={rows.map((r) => ({ ...r, barLabel: barLabel(r) }))}
        layout="vertical"
        margin={{ top: 0, right: 52, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--divider)" />
        {/* Valor já vem no rótulo de cada barra — eixo numérico só poluiria. */}
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="category" width={axisWidth} tick={categoryTick(axisWidth)} axisLine={false} tickLine={false} />
        {tooltip}
        <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={20} isAnimationActive={false}>
          {rows.map((row, i) => (
            <Cell key={row.category} fill={i === 0 ? "var(--chart-1)" : "var(--chart-2)"} />
          ))}
          <LabelList dataKey="barLabel" position="right" style={{ fontSize: 11, fill: "var(--text-secondary)" }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
    </div>
  );
}

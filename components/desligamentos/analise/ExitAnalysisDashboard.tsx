"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, ArrowDown, Minus, Printer } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FieldLabel, Input, Textarea } from "@/components/ui/Field";
import {
  classifyTrend,
  classifyLeader,
  LEADER_CLASSIFICATION_LABELS,
  type LeaderClassification,
  type PeriodMetrics,
  type SegmentBreakdown,
  type Trend,
} from "@/lib/desligamentos/exitAnalysis";
import {
  fetchExitAnalysis,
  fetchExitAnalysisReport,
  saveExitAnalysisRecommendations,
  requestExitThemeAnalysis,
} from "@/app/(dashboard)/desligamentos/analise/actions";

type PeriodInput = { from: string; to: string };
type ExitAnalysisResult = { current: PeriodMetrics; previous: PeriodMetrics | null };
type ThemeResult = { themes: { theme: string; count: number; examples: string[] }[] };
type ReportState = {
  recommendations: string | null;
  themeStatus: string;
  themeResult: ThemeResult | null;
  themeResponsesAnalyzed: number | null;
} | null;

function pct(value: number | null): string {
  return value === null ? "—" : `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

function monthLabel(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return new Date(Date.UTC(year, m - 1, 1)).toLocaleDateString("pt-BR", { month: "short", year: "2-digit", timeZone: "UTC" });
}

function formatDateBr(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

// Seta + cor além da palavra (nunca só texto) — pedido explícito da Fase 6
// pra ficar visualmente claro de relance, inclusive impresso em P&B (a seta
// some, mas a palavra continua).
function TrendBadge({ trend }: { trend: Trend }) {
  if (trend === "SEM_DADOS") return <span style={{ fontSize: 12, color: "var(--text-muted)" }}>—</span>;
  if (trend === "ESTAVEL")
    return (
      <Badge tone="primary">
        <Minus size={12} style={{ marginRight: 2, verticalAlign: -1 }} />
        Estável
      </Badge>
    );
  const Icon = trend === "MELHOROU" ? ArrowUp : ArrowDown;
  return (
    <Badge tone={trend === "MELHOROU" ? "success" : "danger"}>
      <Icon size={12} style={{ marginRight: 2, verticalAlign: -1 }} />
      {trend === "MELHOROU" ? "Melhorou" : "Piorou"}
    </Badge>
  );
}

const CHART_COLORS = { current: "var(--accent-deep)", previous: "#9aa5b1" };

function MonthlyVolumeChart({ data }: { data: { month: string; count: number }[] }) {
  const chartData = data.map((m) => ({ label: monthLabel(m.month), count: m.count }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="count" name="Desligamentos" fill={CHART_COLORS.current} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function ReasonComparisonChart({
  current,
  previous,
}: {
  current: { reason: string; label: string; pct: number }[];
  previous: { reason: string; pct: number }[] | undefined;
}) {
  const data = current.map((r) => ({
    label: r.label,
    atual: Number(r.pct.toFixed(1)),
    anterior: previous ? Number((previous.find((p) => p.reason === r.reason)?.pct ?? 0).toFixed(1)) : undefined,
  }));
  const height = Math.max(180, data.length * 42);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
        <XAxis type="number" unit="%" tick={{ fontSize: 12 }} />
        <YAxis type="category" dataKey="label" width={180} tick={{ fontSize: 12 }} />
        <Tooltip formatter={(value) => `${value}%`} />
        <Legend />
        <Bar dataKey="atual" name="Período atual" fill={CHART_COLORS.current} radius={[0, 4, 4, 0]} />
        {previous && <Bar dataKey="anterior" name="Período anterior" fill={CHART_COLORS.previous} radius={[0, 4, 4, 0]} />}
      </BarChart>
    </ResponsiveContainer>
  );
}

function PerceptionRow({
  label,
  current,
  previous,
}: {
  label: string;
  current: number | null;
  previous: number | null | undefined;
}) {
  const { trend } = classifyTrend(current, previous ?? null);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 100px 100px 120px",
        gap: 12,
        alignItems: "center",
        padding: "10px 0",
        borderTop: "1px solid var(--border)",
        fontSize: 13,
      }}
    >
      <span>{label}</span>
      <span style={{ textAlign: "right", fontWeight: 600 }}>{pct(current)}</span>
      <span style={{ textAlign: "right", color: "var(--text-muted)" }}>{pct(previous ?? null)}</span>
      <span style={{ textAlign: "right" }}>
        <TrendBadge trend={trend} />
      </span>
    </div>
  );
}

const CLASSIFICATION_TONE: Record<LeaderClassification, "success" | "primary" | "danger"> = {
  REFERENCIA: "success",
  ACOMPANHAR: "primary",
  ATENCAO: "danger",
  PRIORIDADE: "danger",
};

function SegmentTable({
  title,
  segments,
  showClassification,
}: {
  title: string;
  segments: SegmentBreakdown[];
  showClassification?: boolean;
}) {
  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span className="fin-eyebrow">{title}</span>
      {segments.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
          Nenhum grupo atingiu o volume mínimo configurado no período.
        </p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--text-muted)" }}>
                <th style={{ padding: "6px 8px" }}>Nome</th>
                <th style={{ padding: "6px 8px", textAlign: "right" }}>Nº saídas</th>
                <th style={{ padding: "6px 8px", textAlign: "right" }}>% motivo controlável</th>
                <th style={{ padding: "6px 8px", textAlign: "right" }}>% ambiente ruim</th>
                <th style={{ padding: "6px 8px", textAlign: "right" }}>% não recomendaria</th>
                {showClassification && <th style={{ padding: "6px 8px", textAlign: "right" }}>Classificação</th>}
              </tr>
            </thead>
            <tbody>
              {segments.map((s) => {
                const classification = showClassification ? classifyLeader(s) : null;
                return (
                  <tr key={s.name} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={{ padding: "6px 8px" }}>{s.name}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right" }}>{s.exitCount}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right" }}>{pct(s.controllableReasonPct)}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right" }}>{pct(s.badEnvironmentPct)}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right" }}>{pct(s.notRecommendPct)}</td>
                    {showClassification && (
                      <td style={{ padding: "6px 8px", textAlign: "right" }}>
                        {classification ? (
                          <Badge tone={CLASSIFICATION_TONE[classification]}>{LEADER_CLASSIFICATION_LABELS[classification]}</Badge>
                        ) : (
                          "—"
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export function ExitAnalysisDashboard({
  companyName,
  initialCurrent,
  initialPrevious,
  initialMinVolume,
  initialData,
  initialReport,
}: {
  companyName: string;
  initialCurrent: PeriodInput;
  initialPrevious: PeriodInput | null;
  initialMinVolume: number;
  initialData: ExitAnalysisResult;
  initialReport: ReportState;
}) {
  const [current, setCurrent] = useState(initialCurrent);
  const [previous, setPrevious] = useState<PeriodInput | null>(initialPrevious);
  const [comparePeriods, setComparePeriods] = useState(initialPrevious !== null);
  const [minVolume, setMinVolume] = useState(initialMinVolume);
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);

  const [report, setReport] = useState<ReportState>(initialReport);
  const [recommendations, setRecommendations] = useState(initialReport?.recommendations ?? "");
  const [savingRecommendations, setSavingRecommendations] = useState(false);
  const [themeRequesting, setThemeRequesting] = useState(false);
  const [themeMessage, setThemeMessage] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function handleRefresh() {
    setLoading(true);
    const result = await fetchExitAnalysis(current, comparePeriods ? previous : null, minVolume);
    setData(result);
    const reportRow = await fetchExitAnalysisReport(current);
    setReport(
      reportRow
        ? {
            recommendations: reportRow.recommendations,
            themeStatus: reportRow.themeStatus,
            themeResult: reportRow.themeResult as ThemeResult | null,
            themeResponsesAnalyzed: reportRow.themeResponsesAnalyzed,
          }
        : null
    );
    setRecommendations(reportRow?.recommendations ?? "");
    setLoading(false);
  }

  async function handleSaveRecommendations() {
    setSavingRecommendations(true);
    await saveExitAnalysisRecommendations(current, recommendations);
    setSavingRecommendations(false);
  }

  async function handleRequestTheme() {
    setThemeRequesting(true);
    setThemeMessage(null);
    const result = await requestExitThemeAnalysis(current);
    setThemeRequesting(false);

    if (result.status === "insufficient") {
      setThemeMessage(`Dados insuficientes para análise de tema (${result.count} de ${result.required} respostas mínimas com consentimento).`);
      setReport((prev) => ({ recommendations: prev?.recommendations ?? null, themeStatus: "INSUFFICIENT_DATA", themeResult: null, themeResponsesAnalyzed: result.count }));
      return;
    }
    if (result.status === "error") {
      setThemeMessage(result.error);
      return;
    }
    setReport((prev) => ({ recommendations: prev?.recommendations ?? null, themeStatus: "PENDING", themeResult: null, themeResponsesAnalyzed: null }));
  }

  // Enquanto PENDING, confere o status a cada 5s (a análise roda em
  // background na fila de tarefas) — pra não deixar a tela presa esperando.
  useEffect(() => {
    if (report?.themeStatus !== "PENDING") {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(async () => {
      const reportRow = await fetchExitAnalysisReport(current);
      if (reportRow && reportRow.themeStatus !== "PENDING") {
        setReport({
          recommendations: reportRow.recommendations,
          themeStatus: reportRow.themeStatus,
          themeResult: reportRow.themeResult as ThemeResult | null,
          themeResponsesAnalyzed: reportRow.themeResponsesAnalyzed,
        });
      }
    }, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report?.themeStatus]);

  const { current: curMetrics, previous: prevMetrics } = data;

  function handleExportPdf() {
    window.print();
  }

  return (
    <>
      {/* Só aparece impresso/exportado em PDF — ver .print-only em
          globals.css. Mesma função do slide 1 do PDF de referência
          ("Apresentação à diretoria"): empresa, período, data de geração. */}
      <div className="print-only" style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Análise de Desligamentos — {companyName}</h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>
          Período: {formatDateBr(current.from)} a {formatDateBr(current.to)}
          {comparePeriods && previous ? ` · Comparado com ${formatDateBr(previous.from)} a ${formatDateBr(previous.to)}` : ""}
        </p>
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0" }}>
          Gerado em {new Date().toLocaleDateString("pt-BR")} às {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>

      <Card className="no-print" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="fin-eyebrow">PERÍODO</span>
          <Button type="button" variant="secondary" onClick={handleExportPdf}>
            <Printer size={14} />
            Exportar PDF
          </Button>
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
          <FieldLabel label="De">
            <Input type="date" value={current.from} onChange={(e) => setCurrent((p) => ({ ...p, from: e.target.value }))} />
          </FieldLabel>
          <FieldLabel label="Até">
            <Input type="date" value={current.to} onChange={(e) => setCurrent((p) => ({ ...p, to: e.target.value }))} />
          </FieldLabel>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            <input type="checkbox" checked={comparePeriods} onChange={(e) => setComparePeriods(e.target.checked)} />
            Comparar com outro período
          </label>
          {comparePeriods && (
            <>
              <FieldLabel label="Comparar de">
                <Input
                  type="date"
                  value={previous?.from ?? ""}
                  onChange={(e) => setPrevious((p) => ({ from: e.target.value, to: p?.to ?? current.from }))}
                />
              </FieldLabel>
              <FieldLabel label="Comparar até">
                <Input
                  type="date"
                  value={previous?.to ?? ""}
                  onChange={(e) => setPrevious((p) => ({ from: p?.from ?? "", to: e.target.value }))}
                />
              </FieldLabel>
            </>
          )}
          <FieldLabel label="Volume mínimo por grupo">
            <Input
              type="number"
              min={1}
              value={minVolume}
              onChange={(e) => setMinVolume(Number(e.target.value) || 1)}
              style={{ width: 90 }}
            />
          </FieldLabel>
          <Button type="button" variant={loading ? "disabled" : "primary"} onClick={handleRefresh} disabled={loading}>
            {loading ? "Calculando..." : "Atualizar"}
          </Button>
        </div>
      </Card>

      <div className="fin-row" style={{ flexWrap: "wrap" }}>
        <StatCard
          selected
          label="Total de respostas"
          value={String(curMetrics.totalResponses)}
          meta={`${curMetrics.totalExits} desligamento(s) no período`}
        />
        <StatCard
          selected
          label="Saída voluntária"
          value={pct(curMetrics.voluntaryPct)}
          meta={prevMetrics ? `Período anterior: ${pct(prevMetrics.voluntaryPct)}` : undefined}
        />
        <StatCard
          label="Saída involuntária"
          value={pct(curMetrics.involuntaryPct)}
          meta={prevMetrics ? `Período anterior: ${pct(prevMetrics.involuntaryPct)}` : undefined}
        />
      </div>

      <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <span className="fin-eyebrow">DESLIGAMENTOS POR MÊS</span>
        {curMetrics.monthlyExitCounts.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Nenhum desligamento no período.</p>
        ) : (
          <MonthlyVolumeChart data={curMetrics.monthlyExitCounts} />
        )}
      </Card>

      <Card style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span className="fin-eyebrow">MOTIVOS DE SAÍDA</span>
        {curMetrics.reasonBreakdown.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Nenhum desligamento no período.</p>
        ) : (
          <ReasonComparisonChart current={curMetrics.reasonBreakdown} previous={prevMetrics?.reasonBreakdown} />
        )}
      </Card>

      {curMetrics.reasonDetailBreakdown.length > 0 && (
        <Card style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span className="fin-eyebrow">MOTIVO DETALHADO (DESLIGAMENTOS "OUTRO" IMPORTADOS)</span>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
            Texto original da planilha, quando o motivo não batia com nenhuma opção do sistema.
          </p>
          {curMetrics.reasonDetailBreakdown.slice(0, 8).map((c) => (
            <div key={c.category} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0", borderTop: "1px solid var(--border)" }}>
              <span>{c.category}</span>
              <strong>{pct(c.pct)}</strong>
            </div>
          ))}
        </Card>
      )}

      <Card style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span className="fin-eyebrow">PERCEPÇÃO (% RESPOSTAS POSITIVAS)</span>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 100px 100px 120px",
            gap: 12,
            fontSize: 11,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            paddingBottom: 4,
          }}
        >
          <span>Dimensão</span>
          <span style={{ textAlign: "right" }}>Atual</span>
          <span style={{ textAlign: "right" }}>Anterior</span>
          <span style={{ textAlign: "right" }}>Tendência</span>
        </div>
        <PerceptionRow label="Ambiente de trabalho" current={curMetrics.perception.environmentPositivePct} previous={prevMetrics?.perception.environmentPositivePct} />
        <PerceptionRow label="Relação com o líder" current={curMetrics.perception.leaderRelationshipPositivePct} previous={prevMetrics?.perception.leaderRelationshipPositivePct} />
        <PerceptionRow label="Crescimento" current={curMetrics.perception.growthPositivePct} previous={prevMetrics?.perception.growthPositivePct} />
        <PerceptionRow label="Benefícios" current={curMetrics.perception.benefitsPositivePct} previous={prevMetrics?.perception.benefitsPositivePct} />
        <PerceptionRow label="Comunicação" current={curMetrics.perception.communicationPositivePct} previous={prevMetrics?.perception.communicationPositivePct} />
        <PerceptionRow label="Recomendaria a empresa" current={curMetrics.perception.wouldRecommendPct} previous={prevMetrics?.perception.wouldRecommendPct} />
        <PerceptionRow label="Voltaria a trabalhar" current={curMetrics.perception.wouldReturnPct} previous={prevMetrics?.perception.wouldReturnPct} />
      </Card>

      <div className="fin-row" style={{ flexWrap: "wrap", alignItems: "stretch" }}>
        <Card style={{ flex: 1, minWidth: 280, display: "flex", flexDirection: "column", gap: 8 }}>
          <span className="fin-eyebrow">MAIOR DESAFIO</span>
          {curMetrics.biggestChallengeBreakdown.slice(0, 8).map((c) => (
            <div key={c.category} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0" }}>
              <span>{c.category}</span>
              <strong>{pct(c.pct)}</strong>
            </div>
          ))}
          {curMetrics.biggestChallengeBreakdown.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Sem respostas com esse campo preenchido.</p>
          )}
        </Card>
        <Card style={{ flex: 1, minWidth: 280, display: "flex", flexDirection: "column", gap: 8 }}>
          <span className="fin-eyebrow">SUGESTÕES DE MELHORIA</span>
          {curMetrics.improvementSuggestionBreakdown.slice(0, 8).map((c) => (
            <div key={c.category} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0" }}>
              <span>{c.category}</span>
              <strong>{pct(c.pct)}</strong>
            </div>
          ))}
          {curMetrics.improvementSuggestionBreakdown.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Sem respostas com esse campo preenchido.</p>
          )}
        </Card>
      </div>

      <SegmentTable title={`RECORTE POR SETOR (mín. ${minVolume} saídas)`} segments={curMetrics.departmentBreakdown} />
      <SegmentTable
        title={`RECORTE POR LÍDER (mín. ${minVolume} respostas)`}
        segments={curMetrics.leaderBreakdown}
        showClassification
      />

      <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <span className="fin-eyebrow">ANÁLISE DE TEMA DOS COMENTÁRIOS (IA)</span>
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
          Só analisa comentários de respostas com consentimento ativo para análise por IA. Respostas importadas do
          histórico nunca entram aqui.
        </p>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Button type="button" variant={themeRequesting ? "disabled" : "secondary"} onClick={handleRequestTheme} disabled={themeRequesting}>
            {themeRequesting ? "Solicitando..." : "Gerar análise de tema"}
          </Button>
          {report?.themeStatus && report.themeStatus !== "IDLE" && (
            <Badge tone={report.themeStatus === "DONE" ? "success" : report.themeStatus === "FAILED" ? "danger" : "primary"}>
              {report.themeStatus === "PENDING" && "Processando..."}
              {report.themeStatus === "DONE" && "Concluído"}
              {report.themeStatus === "FAILED" && "Falhou"}
              {report.themeStatus === "INSUFFICIENT_DATA" && "Dados insuficientes"}
            </Badge>
          )}
        </div>
        {themeMessage && <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>{themeMessage}</p>}
        {report?.themeStatus === "DONE" && report.themeResult && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Baseado em {report.themeResponsesAnalyzed} comentário(s) com consentimento.
            </span>
            {report.themeResult.themes.map((t) => (
              <div key={t.theme} style={{ borderTop: "1px solid var(--border)", paddingTop: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600 }}>
                  <span>{t.theme}</span>
                  <span>{t.count}x</span>
                </div>
                {t.examples.map((ex, i) => (
                  <p key={i} style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0" }}>
                    "{ex}"
                  </p>
                ))}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <span className="fin-eyebrow">RECOMENDAÇÕES DO RH</span>
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
          Texto livre, escrito por você — o sistema nunca gera recomendações automáticas aqui.
        </p>
        <Textarea
          value={recommendations}
          onChange={(e) => setRecommendations(e.target.value)}
          style={{ minHeight: 140 }}
          placeholder="Ex.: reforçar treinamento de lideranças no setor de Costura, revisar política salarial..."
        />
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button type="button" variant={savingRecommendations ? "disabled" : "confirm"} onClick={handleSaveRecommendations} disabled={savingRecommendations}>
            {savingRecommendations ? "Salvando..." : "Salvar recomendações"}
          </Button>
        </div>
      </Card>
    </>
  );
}

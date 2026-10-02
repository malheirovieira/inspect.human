"use client";

import { useEffect, useRef, useState } from "react";
import { Printer } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FieldLabel, Input, Textarea } from "@/components/ui/Field";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { classifyLeader, type PeriodMetrics, type SegmentBreakdown } from "@/lib/desligamentos/exitAnalysis";
import {
  fetchExitAnalysis,
  fetchExitAnalysisReport,
  saveExitAnalysisRecommendations,
  requestExitThemeAnalysis,
} from "@/app/(dashboard)/desligamentos/analise/actions";
import { CategoryChartCard, EmptyChart, MonthlyVolumeChart, ReasonComparisonChart, ReportCard } from "./charts";
import {
  HeadlineStat,
  LeaderLegend,
  LeaderPill,
  PerceptionHead,
  PerceptionRow,
  countComparison,
  fmtPct,
  pctComparison,
} from "./widgets";

type PeriodInput = { from: string; to: string };
type ExitAnalysisResult = { current: PeriodMetrics; previous: PeriodMetrics | null };
type ThemeResult = { themes: { theme: string; count: number; examples: string[] }[] };
type ReportState = {
  recommendations: string | null;
  themeStatus: string;
  themeResult: ThemeResult | null;
  themeResponsesAnalyzed: number | null;
} | null;

function monthLabel(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return new Date(Date.UTC(year, m - 1, 1)).toLocaleDateString("pt-BR", { month: "short", year: "2-digit", timeZone: "UTC" });
}

function formatDateBr(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function SegmentTable({ segments, showClassification }: { segments: SegmentBreakdown[]; showClassification?: boolean }) {
  if (segments.length === 0) {
    return <EmptyChart>Nenhum grupo atingiu o volume mínimo configurado no período.</EmptyChart>;
  }
  return (
    <div className="fin-report-table-wrap">
      <table className="fin-report-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Saídas</th>
            <th>Motivo controlável</th>
            <th>Ambiente ruim</th>
            <th>Não recomendaria</th>
            {showClassification && <th>Classificação</th>}
          </tr>
        </thead>
        <tbody>
          {segments.map((s) => {
            const classification = showClassification ? classifyLeader(s) : null;
            return (
              <tr key={s.name}>
                <td>{s.name}</td>
                <td>{s.exitCount}</td>
                <td>{fmtPct(s.controllableReasonPct)}</td>
                <td>{fmtPct(s.badEnvironmentPct)}</td>
                <td>{fmtPct(s.notRecommendPct)}</td>
                {showClassification && <td>{classification ? <LeaderPill classification={classification} /> : "—"}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const THEME_STATUS_LABEL: Record<string, string> = {
  PENDING: "Processando...",
  DONE: "Concluído",
  FAILED: "Falhou",
  INSUFFICIENT_DATA: "Dados insuficientes",
};

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

  const { current: cur, previous: prev } = data;
  const hasPrevious = prev !== null;

  // Comparação de motivos: união dos dois períodos — um motivo que só
  // aparece no período anterior também entra (com 0% no atual).
  const reasonComparison = prev
    ? Array.from(new Set([...cur.reasonBreakdown.map((r) => r.reason), ...prev.reasonBreakdown.map((r) => r.reason)])).map(
        (reason) => {
          const c = cur.reasonBreakdown.find((r) => r.reason === reason);
          const p = prev.reasonBreakdown.find((r) => r.reason === reason);
          return {
            label: c?.label ?? p?.label ?? reason,
            atual: Number((c?.pct ?? 0).toFixed(1)),
            anterior: Number((p?.pct ?? 0).toFixed(1)),
          };
        }
      )
    : [];

  return (
    <div className="fin-report">
      {/* Só aparece impresso/exportado em PDF — ver .print-only em
          globals.css. Mesma função da capa do PDF de referência
          ("Apresentação à diretoria"): empresa, período, data de geração. */}
      <div className="print-only">
        <SectionLabel>Apresentação à diretoria</SectionLabel>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: "6px 0 0", color: "var(--accent-deep)" }}>
          Análise de Desligamentos — {companyName}
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "6px 0 0" }}>
          Período: {formatDateBr(current.from)} a {formatDateBr(current.to)}
          {comparePeriods && previous ? ` · comparado com ${formatDateBr(previous.from)} a ${formatDateBr(previous.to)}` : ""}
        </p>
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0" }}>
          Gerado em {new Date().toLocaleDateString("pt-BR")} às{" "}
          {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>

      <Card className="fin-report-card no-print">
        <div className="fin-report-card__head">
          <SectionLabel>Período analisado</SectionLabel>
          <Button type="button" variant="secondary" onClick={() => window.print()}>
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
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, height: 32 }}>
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

      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <SectionLabel>Resumo executivo</SectionLabel>
        <div className="fin-report-grid">
          <HeadlineStat
            featured
            label="Saída voluntária"
            value={fmtPct(cur.voluntaryPct)}
            {...pctComparison(cur.voluntaryPct, prev?.voluntaryPct)}
            support="Desligamentos a pedido do colaborador"
          />
          <HeadlineStat
            label="Respostas da pesquisa"
            value={String(cur.totalResponses)}
            {...countComparison(cur.totalResponses, prev?.totalResponses)}
            support={`${cur.totalExits} desligamento(s) no período`}
          />
          <HeadlineStat
            label="Saída involuntária"
            value={fmtPct(cur.involuntaryPct)}
            {...pctComparison(cur.involuntaryPct, prev?.involuntaryPct)}
            support="Desligamentos por decisão da empresa"
          />
          <HeadlineStat
            label="Recomendariam a empresa"
            value={fmtPct(cur.perception.wouldRecommendPct)}
            {...pctComparison(cur.perception.wouldRecommendPct, prev?.perception.wouldRecommendPct)}
            support="Entre quem respondeu a pesquisa"
          />
        </div>
      </section>

      <div className="fin-report-grid fin-report-grid--wide">
        <ReportCard label="Volume" title="Desligamentos por mês">
          {cur.monthlyExitCounts.length === 0 ? (
            <EmptyChart>Nenhum desligamento no período.</EmptyChart>
          ) : (
            <MonthlyVolumeChart data={cur.monthlyExitCounts.map((m) => ({ label: monthLabel(m.month), count: m.count }))} />
          )}
        </ReportCard>

        {hasPrevious ? (
          <ReportCard
            label="Motivos declarados"
            title="Motivo de saída — atual × anterior"
            hint="% sobre o total de desligamentos de cada período. Comparação sempre em barras."
          >
            {reasonComparison.length === 0 ? <EmptyChart>Nenhum desligamento no período.</EmptyChart> : <ReasonComparisonChart data={reasonComparison} />}
          </ReportCard>
        ) : (
          <CategoryChartCard
            label="Motivos declarados"
            title="Motivo de saída"
            items={cur.reasonBreakdown.map((r) => ({ category: r.label, count: r.count, pct: r.pct }))}
            pctBase="dos desligamentos"
            emptyText="Nenhum desligamento no período."
          />
        )}
      </div>

      {cur.reasonDetailBreakdown.length > 0 && (
        <CategoryChartCard
          label="Motivo detalhado"
          title="Motivo original das planilhas importadas"
          items={cur.reasonDetailBreakdown}
          pctBase="dos desligamentos"
        />
      )}

      <ReportCard
        label="Percepção"
        title="Clima na saída — % de respostas positivas"
        hint="Notas 4 e 5 (ou “sim”) sobre o total de quem respondeu cada pergunta."
      >
        <div>
          <PerceptionHead hasPrevious={hasPrevious} />
          <PerceptionRow label="Ambiente de trabalho" current={cur.perception.environmentPositivePct} previous={prev?.perception.environmentPositivePct} />
          <PerceptionRow label="Relação com o líder" current={cur.perception.leaderRelationshipPositivePct} previous={prev?.perception.leaderRelationshipPositivePct} />
          <PerceptionRow label="Crescimento" current={cur.perception.growthPositivePct} previous={prev?.perception.growthPositivePct} />
          <PerceptionRow label="Benefícios" current={cur.perception.benefitsPositivePct} previous={prev?.perception.benefitsPositivePct} />
          <PerceptionRow label="Comunicação" current={cur.perception.communicationPositivePct} previous={prev?.perception.communicationPositivePct} />
          <PerceptionRow label="Recomendaria a empresa" current={cur.perception.wouldRecommendPct} previous={prev?.perception.wouldRecommendPct} />
          <PerceptionRow label="Voltaria a trabalhar" current={cur.perception.wouldReturnPct} previous={prev?.perception.wouldReturnPct} />
        </div>
      </ReportCard>

      <div className="fin-report-grid fin-report-grid--wide">
        <CategoryChartCard label="Desafios" title="Maior desafio enfrentado" items={cur.biggestChallengeBreakdown} pctBase="dos respondentes" />
        <CategoryChartCard label="Sugestões" title="O que a empresa poderia melhorar" items={cur.improvementSuggestionBreakdown} pctBase="dos respondentes" />
      </div>

      <ReportCard label="Recorte por setor" title={`Setores com ${minVolume}+ saídas`}>
        <SegmentTable segments={cur.departmentBreakdown} />
      </ReportCard>

      <ReportCard label="Recorte por liderança" title={`Líderes com ${minVolume}+ respostas`}>
        <LeaderLegend />
        <SegmentTable segments={cur.leaderBreakdown} showClassification />
      </ReportCard>

      <ReportCard
        label="Temas dos comentários"
        title="Análise de tema por IA"
        hint="Só comentários de respostas com consentimento ativo. Respostas importadas do histórico nunca entram aqui."
        action={
          <Button
            type="button"
            className="no-print"
            variant={themeRequesting ? "disabled" : "secondary"}
            onClick={handleRequestTheme}
            disabled={themeRequesting}
          >
            {themeRequesting ? "Solicitando..." : "Gerar análise de tema"}
          </Button>
        }
      >
        {report?.themeStatus && report.themeStatus !== "IDLE" && (
          <div>
            <Badge tone={report.themeStatus === "DONE" ? "success" : report.themeStatus === "FAILED" ? "danger" : "primary"}>
              {THEME_STATUS_LABEL[report.themeStatus] ?? report.themeStatus}
            </Badge>
          </div>
        )}
        {themeMessage && <EmptyChart>{themeMessage}</EmptyChart>}
        {report?.themeStatus === "DONE" && report.themeResult && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Baseado em {report.themeResponsesAnalyzed} comentário(s) com consentimento.
            </span>
            {report.themeResult.themes.map((t) => (
              <div key={t.theme} style={{ borderTop: "1px solid var(--divider)", paddingTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 600 }}>
                  <span>{t.theme}</span>
                  <span style={{ color: "var(--accent-deep)" }}>{t.count}×</span>
                </div>
                {t.examples.map((ex, i) => (
                  <p key={i} style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0", fontStyle: "italic" }}>
                    “{ex}”
                  </p>
                ))}
              </div>
            ))}
          </div>
        )}
      </ReportCard>

      <ReportCard
        label="Recomendações do RH"
        title="Próximos passos"
        hint="Texto livre, escrito pelo RH — o sistema nunca gera recomendações automáticas aqui."
      >
        <div className="no-print" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
        </div>
        {/* No PDF sai o texto corrido, não a caixa de edição (que cortaria
            o conteúdo longo). */}
        <p className="print-only" style={{ fontSize: 13, lineHeight: "20px", whiteSpace: "pre-wrap", margin: 0 }}>
          {recommendations.trim() || "Nenhuma recomendação registrada para este período."}
        </p>
      </ReportCard>
    </div>
  );
}

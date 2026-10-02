import { EXIT_REASONS, EXIT_REASON_LABELS } from "@/schemas/employeeExit";
import { REASON_DETAIL_NOTE_PREFIX } from "./importExitHistory";

// Uma linha = um EmployeeExit, com os campos da ExitSurveyResponse ligada
// (quando existir) já achatados — pensado pra ser montado fora daqui (ver
// services/exitAnalysis.ts) e permitir testar todo o cálculo sem banco.
export type ExitAnalysisRow = {
  exitDate: Date;
  exitType: string; // "VOLUNTARIA" | "INVOLUNTARIA"
  reason: string; // um de EXIT_REASONS (ou "OUTRO" de fallback)
  // Quando reason="OUTRO" por fallback de importação (ver
  // lib/desligamentos/importExitHistory.ts), este campo pode conter o motivo
  // original em texto livre da planilha, usado só pra extrair um breakdown
  // mais específico (ver extractImportedReasonDetail) — nunca exibido cru.
  notes: string | null;
  department: string | null;
  hasSurveyResponse: boolean;
  leaderName: string | null;
  environmentScore: number | null;
  leaderRelationshipScore: number | null;
  growthScore: number | null;
  benefitsScore: number | null;
  communicationScore: number | null;
  biggestChallenge: string | null;
  improvementSuggestion: string | null;
  wouldReturn: boolean | null;
  wouldRecommend: boolean | null;
};

export function normalizeGroupKey(raw: string): string {
  return raw.trim().toLowerCase();
}

// Nomes digitados de forma ligeiramente diferente (ex. "Maria" vs "Maria
// Silva" vs "maria") seriam líderes/setores DIFERENTES numa comparação
// exata. Agrupamos por trim+lowercase mas exibimos o rótulo original mais
// frequente dentro do grupo (decisão tomada com o usuário na Fase 5).
export function groupByNormalizedName<T>(
  items: T[],
  getName: (item: T) => string
): Map<string, { label: string; items: T[] }> {
  const groups = new Map<string, { label: string; items: T[]; labelCounts: Map<string, number> }>();
  for (const item of items) {
    const raw = getName(item).trim();
    if (!raw) continue;
    const key = normalizeGroupKey(raw);
    let group = groups.get(key);
    if (!group) {
      group = { label: raw, items: [], labelCounts: new Map() };
      groups.set(key, group);
    }
    group.items.push(item);
    group.labelCounts.set(raw, (group.labelCounts.get(raw) ?? 0) + 1);
  }

  const result = new Map<string, { label: string; items: T[] }>();
  for (const [key, group] of groups) {
    let bestLabel = group.label;
    let bestCount = -1;
    for (const [label, count] of group.labelCounts) {
      if (count > bestCount) {
        bestLabel = label;
        bestCount = count;
      }
    }
    result.set(key, { label: bestLabel, items: group.items });
  }
  return result;
}

// Planilhas/formulários de origem trazem motivo/desafio/sugestão como
// multi-seleção em texto livre separado por vírgula (ex. "Consegui outro
// emprego, Ambiente difícil") — cada opção marcada vira sua própria
// categoria na contagem (o % é sobre o total de respondentes, não de
// seleções: alguém que marcou 2 opções conta 1x em cada uma).
export function splitMultiSelect(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export type CategoryCount = { category: string; count: number; pct: number };

export function tallyCategories(rows: string[], totalForPct: number): CategoryCount[] {
  const counts = new Map<string, number>();
  for (const raw of rows) {
    for (const category of splitMultiSelect(raw)) {
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
  }
  const result: CategoryCount[] = [];
  for (const [category, count] of counts) {
    result.push({ category, count, pct: totalForPct > 0 ? (count / totalForPct) * 100 : 0 });
  }
  return result.sort((a, b) => b.count - a.count);
}

// "Motivo controlável": dentro do nosso enum atual (que descreve COMO o
// desligamento terminou, não POR QUÊ), só PEDIU_DEMISSAO reflete uma escolha
// do colaborador que a empresa poderia, em tese, ter evitado com retenção —
// os demais (desligamento sem/com justa causa, fim de contrato, aposentadoria,
// outro) são decisões administrativas ou fora do alcance de ações de RH.
// Esta é uma aproximação declarada, não uma categorização de causa-raiz.
export function isControllableReason(reason: string): boolean {
  return reason === "PEDIU_DEMISSAO";
}

// Motivo "Outro" por fallback de importação guarda o texto original da
// planilha em notes (ver REASON_DETAIL_NOTE_PREFIX) — extrai de volta pra dar
// um breakdown útil (ex. "% motivos pessoais") em vez de só "Outro: 100%".
export function extractImportedReasonDetail(notes: string | null): string | null {
  if (!notes) return null;
  const parts = notes.split(" | ");
  const match = parts.find((p) => p.startsWith(REASON_DETAIL_NOTE_PREFIX));
  if (!match) return null;
  const detail = match.slice(REASON_DETAIL_NOTE_PREFIX.length).trim();
  return detail || null;
}

export function reasonLabel(reason: string): string {
  return (EXIT_REASON_LABELS as Record<string, string>)[reason] ?? reason;
}

function rate(numerator: number, denominator: number): number | null {
  return denominator > 0 ? (numerator / denominator) * 100 : null;
}

function scorePositiveRate(scores: (number | null)[]): number | null {
  const answered = scores.filter((s): s is number => s !== null);
  if (answered.length === 0) return null;
  const positive = answered.filter((s) => s >= 4).length;
  return rate(positive, answered.length);
}

function scoreBadRate(scores: (number | null)[]): number | null {
  const answered = scores.filter((s): s is number => s !== null);
  if (answered.length === 0) return null;
  const bad = answered.filter((s) => s <= 2).length;
  return rate(bad, answered.length);
}

function boolTrueRate(values: (boolean | null)[]): number | null {
  const answered = values.filter((v): v is boolean => v !== null);
  if (answered.length === 0) return null;
  const trueCount = answered.filter((v) => v).length;
  return rate(trueCount, answered.length);
}

function boolFalseRate(values: (boolean | null)[]): number | null {
  const answered = values.filter((v): v is boolean => v !== null);
  if (answered.length === 0) return null;
  const falseCount = answered.filter((v) => !v).length;
  return rate(falseCount, answered.length);
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export type SegmentBreakdown = {
  name: string;
  exitCount: number;
  controllableReasonPct: number | null;
  badEnvironmentPct: number | null;
  notRecommendPct: number | null;
};

export type PeriodMetrics = {
  totalExits: number;
  totalResponses: number;
  voluntaryPct: number | null;
  involuntaryPct: number | null;
  monthlyExitCounts: { month: string; count: number }[];
  reasonBreakdown: { reason: string; label: string; count: number; pct: number }[];
  // Só preenchido quando há desligamentos "Outro" vindos de importação com
  // motivo detalhado recuperável das observações (ver
  // extractImportedReasonDetail) — complementa reasonBreakdown pra planilhas
  // cujo motivo original é texto livre multi-seleção.
  reasonDetailBreakdown: CategoryCount[];
  perception: {
    environmentPositivePct: number | null;
    leaderRelationshipPositivePct: number | null;
    growthPositivePct: number | null;
    benefitsPositivePct: number | null;
    communicationPositivePct: number | null;
    wouldRecommendPct: number | null;
    wouldReturnPct: number | null;
  };
  biggestChallengeBreakdown: CategoryCount[];
  improvementSuggestionBreakdown: CategoryCount[];
  departmentBreakdown: SegmentBreakdown[];
  leaderBreakdown: SegmentBreakdown[];
};

export function computePeriodMetrics(rows: ExitAnalysisRow[], minVolume = 10): PeriodMetrics {
  const totalExits = rows.length;
  const responses = rows.filter((r) => r.hasSurveyResponse);
  const totalResponses = responses.length;

  const voluntaryCount = rows.filter((r) => r.exitType === "VOLUNTARIA").length;
  const involuntaryCount = rows.filter((r) => r.exitType === "INVOLUNTARIA").length;

  const monthCounts = new Map<string, number>();
  for (const row of rows) {
    const key = monthKey(row.exitDate);
    monthCounts.set(key, (monthCounts.get(key) ?? 0) + 1);
  }
  const monthlyExitCounts = Array.from(monthCounts.entries())
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const reasonCounts = new Map<string, number>();
  for (const row of rows) {
    reasonCounts.set(row.reason, (reasonCounts.get(row.reason) ?? 0) + 1);
  }
  const reasonBreakdown = EXIT_REASONS.map((reason) => ({
    reason: reason as string,
    label: reasonLabel(reason),
    count: reasonCounts.get(reason) ?? 0,
    pct: rate(reasonCounts.get(reason) ?? 0, totalExits) ?? 0,
  }))
    .concat(
      Array.from(reasonCounts.entries())
        .filter(([reason]) => !(EXIT_REASONS as readonly string[]).includes(reason))
        .map(([reason, count]) => ({ reason, label: reasonLabel(reason), count, pct: rate(count, totalExits) ?? 0 }))
    )
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count);

  const reasonDetails = rows.map((r) => extractImportedReasonDetail(r.notes)).filter((d): d is string => d !== null);
  const reasonDetailBreakdown = tallyCategories(reasonDetails, rows.length);

  const perception = {
    environmentPositivePct: scorePositiveRate(responses.map((r) => r.environmentScore)),
    leaderRelationshipPositivePct: scorePositiveRate(responses.map((r) => r.leaderRelationshipScore)),
    growthPositivePct: scorePositiveRate(responses.map((r) => r.growthScore)),
    benefitsPositivePct: scorePositiveRate(responses.map((r) => r.benefitsScore)),
    communicationPositivePct: scorePositiveRate(responses.map((r) => r.communicationScore)),
    wouldRecommendPct: boolTrueRate(responses.map((r) => r.wouldRecommend)),
    wouldReturnPct: boolTrueRate(responses.map((r) => r.wouldReturn)),
  };

  const biggestChallengeBreakdown = tallyCategories(
    responses.map((r) => r.biggestChallenge ?? "").filter(Boolean),
    totalResponses
  );
  const improvementSuggestionBreakdown = tallyCategories(
    responses.map((r) => r.improvementSuggestion ?? "").filter(Boolean),
    totalResponses
  );

  function buildSegments(groups: Map<string, { label: string; items: ExitAnalysisRow[] }>): SegmentBreakdown[] {
    return Array.from(groups.values())
      .filter((g) => g.items.length >= minVolume)
      .map((g) => {
        const segResponses = g.items.filter((r) => r.hasSurveyResponse);
        return {
          name: g.label,
          exitCount: g.items.length,
          controllableReasonPct: rate(g.items.filter((r) => isControllableReason(r.reason)).length, g.items.length),
          badEnvironmentPct: scoreBadRate(segResponses.map((r) => r.environmentScore)),
          notRecommendPct: boolFalseRate(segResponses.map((r) => r.wouldRecommend)),
        };
      })
      .sort((a, b) => b.exitCount - a.exitCount);
  }

  const departmentGroups = groupByNormalizedName(
    rows.filter((r) => r.department),
    (r) => r.department as string
  );
  const leaderGroups = groupByNormalizedName(
    responses.filter((r) => r.leaderName),
    (r) => r.leaderName as string
  );

  return {
    totalExits,
    totalResponses,
    voluntaryPct: rate(voluntaryCount, totalExits),
    involuntaryPct: rate(involuntaryCount, totalExits),
    monthlyExitCounts,
    reasonBreakdown,
    reasonDetailBreakdown,
    perception,
    biggestChallengeBreakdown,
    improvementSuggestionBreakdown,
    departmentBreakdown: buildSegments(departmentGroups),
    leaderBreakdown: buildSegments(leaderGroups),
  };
}

export type Trend = "MELHOROU" | "PIOROU" | "ESTAVEL" | "SEM_DADOS";

// "Piorou/Melhorou" é sempre CALCULADO (diferença de pontos percentuais),
// nunca escolhido manualmente. higherIsBetter inverte o sinal pra métricas
// onde menos é melhor (ex. nenhuma usada hoje, mas deixa o helper genérico).
export function classifyTrend(current: number | null, previous: number | null, higherIsBetter = true): { deltaPoints: number | null; trend: Trend } {
  if (current === null || previous === null) return { deltaPoints: null, trend: "SEM_DADOS" };
  const delta = current - previous;
  const signedDelta = higherIsBetter ? delta : -delta;
  if (Math.abs(delta) < 0.05) return { deltaPoints: delta, trend: "ESTAVEL" };
  return { deltaPoints: delta, trend: signedDelta > 0 ? "MELHOROU" : "PIOROU" };
}

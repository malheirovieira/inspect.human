import { describe, expect, it } from "vitest";
import {
  normalizeGroupKey,
  groupByNormalizedName,
  splitMultiSelect,
  tallyCategories,
  isControllableReason,
  computePeriodMetrics,
  classifyTrend,
  extractImportedReasonDetail,
  type ExitAnalysisRow,
} from "@/lib/desligamentos/exitAnalysis";
import { REASON_DETAIL_NOTE_PREFIX } from "@/lib/desligamentos/importExitHistory";

function row(overrides: Partial<ExitAnalysisRow> = {}): ExitAnalysisRow {
  return {
    exitDate: new Date("2024-03-15T00:00:00.000Z"),
    exitType: "VOLUNTARIA",
    reason: "PEDIU_DEMISSAO",
    notes: null,
    department: "Costura",
    hasSurveyResponse: true,
    leaderName: "Maria",
    environmentScore: 4,
    leaderRelationshipScore: 4,
    growthScore: 4,
    benefitsScore: 4,
    communicationScore: 4,
    biggestChallenge: "Carga de trabalho excessiva",
    improvementSuggestion: "Aumentar os benefícios",
    wouldReturn: true,
    wouldRecommend: true,
    ...overrides,
  };
}

describe("normalizeGroupKey / groupByNormalizedName", () => {
  it("agrupa nomes com variação de maiúsculas/espaços na mesma chave", () => {
    expect(normalizeGroupKey("  Maria  ")).toBe("maria");
    expect(normalizeGroupKey("MARIA")).toBe("maria");
  });

  it("usa o rótulo mais frequente do grupo como label de exibição", () => {
    const items = ["Maria", "maria", "Maria", "MARIA"];
    const groups = groupByNormalizedName(items, (s) => s);
    expect(groups.size).toBe(1);
    expect(groups.get("maria")?.label).toBe("Maria");
    expect(groups.get("maria")?.items.length).toBe(4);
  });

  it("trata nomes diferentes como grupos diferentes mesmo com um prefixo comum", () => {
    const items = ["Maria", "Maria Silva"];
    const groups = groupByNormalizedName(items, (s) => s);
    expect(groups.size).toBe(2);
  });
});

describe("splitMultiSelect / tallyCategories", () => {
  it("separa opções multi-seleção por vírgula", () => {
    expect(splitMultiSelect("Consegui outro emprego, Ambiente difícil")).toEqual([
      "Consegui outro emprego",
      "Ambiente difícil",
    ]);
  });

  it("calcula % sobre o total de respondentes, não de seleções", () => {
    const result = tallyCategories(["A, B", "A", "B"], 3);
    const a = result.find((r) => r.category === "A");
    const b = result.find((r) => r.category === "B");
    expect(a?.count).toBe(2);
    expect(a?.pct).toBeCloseTo((2 / 3) * 100);
    expect(b?.count).toBe(2);
  });
});

describe("isControllableReason", () => {
  it("só PEDIU_DEMISSAO é considerado controlável na V1", () => {
    expect(isControllableReason("PEDIU_DEMISSAO")).toBe(true);
    expect(isControllableReason("APOSENTADORIA")).toBe(false);
    expect(isControllableReason("FIM_DE_CONTRATO")).toBe(false);
  });
});

describe("classifyTrend", () => {
  it("sem dados quando algum dos dois é null", () => {
    expect(classifyTrend(null, 50).trend).toBe("SEM_DADOS");
    expect(classifyTrend(50, null).trend).toBe("SEM_DADOS");
  });

  it("melhorou quando sobe (higherIsBetter)", () => {
    const r = classifyTrend(74, 56);
    expect(r.trend).toBe("MELHOROU");
    expect(r.deltaPoints).toBeCloseTo(18);
  });

  it("piorou quando desce (higherIsBetter)", () => {
    expect(classifyTrend(40, 56).trend).toBe("PIOROU");
  });

  it("estável quando a diferença é desprezível", () => {
    expect(classifyTrend(50, 50).trend).toBe("ESTAVEL");
  });
});

describe("computePeriodMetrics", () => {
  it("calcula totais, % voluntária/involuntária e percepção", () => {
    const rows = [
      row({ exitType: "VOLUNTARIA" }),
      row({ exitType: "VOLUNTARIA" }),
      row({ exitType: "INVOLUNTARIA", environmentScore: 1, wouldRecommend: false }),
    ];
    const metrics = computePeriodMetrics(rows, 1);
    expect(metrics.totalExits).toBe(3);
    expect(metrics.totalResponses).toBe(3);
    expect(metrics.voluntaryPct).toBeCloseTo((2 / 3) * 100);
    expect(metrics.involuntaryPct).toBeCloseTo((1 / 3) * 100);
    expect(metrics.perception.environmentPositivePct).toBeCloseTo((2 / 3) * 100);
    expect(metrics.perception.wouldRecommendPct).toBeCloseTo((2 / 3) * 100);
  });

  it("respostas importadas sem survey não entram na percepção, mas entram no total de saídas", () => {
    const rows = [row({ hasSurveyResponse: true }), row({ hasSurveyResponse: false })];
    const metrics = computePeriodMetrics(rows, 1);
    expect(metrics.totalExits).toBe(2);
    expect(metrics.totalResponses).toBe(1);
  });

  it("só inclui setor/líder com volume mínimo", () => {
    const rows = [
      row({ department: "Costura" }),
      row({ department: "Costura" }),
      row({ department: "Administrativo" }),
    ];
    const metrics = computePeriodMetrics(rows, 2);
    expect(metrics.departmentBreakdown.map((d) => d.name)).toEqual(["Costura"]);
  });

  it("agrupa motivo desconhecido (fallback OUTRO) normalmente no breakdown", () => {
    const rows = [row({ reason: "OUTRO" }), row({ reason: "OUTRO" }), row({ reason: "PEDIU_DEMISSAO" })];
    const metrics = computePeriodMetrics(rows, 1);
    const outro = metrics.reasonBreakdown.find((r) => r.reason === "OUTRO");
    expect(outro?.count).toBe(2);
  });

  it("extrai o motivo detalhado de notes pra planilhas com motivo multi-seleção (fallback OUTRO)", () => {
    const rows = [
      row({ reason: "OUTRO", notes: `${REASON_DETAIL_NOTE_PREFIX}Motivos pessoais ou familiares` }),
      row({ reason: "OUTRO", notes: `Observação qualquer | ${REASON_DETAIL_NOTE_PREFIX}Motivos pessoais ou familiares, Consegui outro emprego` }),
      row({ reason: "PEDIU_DEMISSAO", notes: null }),
    ];
    const metrics = computePeriodMetrics(rows, 1);
    const pessoais = metrics.reasonDetailBreakdown.find((r) => r.category === "Motivos pessoais ou familiares");
    expect(pessoais?.count).toBe(2);
  });
});

describe("extractImportedReasonDetail", () => {
  it("retorna null sem o marcador", () => {
    expect(extractImportedReasonDetail(null)).toBeNull();
    expect(extractImportedReasonDetail("observação qualquer")).toBeNull();
  });

  it("extrai o texto após o marcador, mesmo combinado com outras observações", () => {
    expect(extractImportedReasonDetail(`${REASON_DETAIL_NOTE_PREFIX}Mudança de cidade`)).toBe("Mudança de cidade");
    expect(extractImportedReasonDetail(`Nota X | ${REASON_DETAIL_NOTE_PREFIX}Mudança de cidade`)).toBe("Mudança de cidade");
  });
});

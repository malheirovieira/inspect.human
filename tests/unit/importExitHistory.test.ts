import { describe, expect, it } from "vitest";
import {
  parseDateFlexible,
  normalizeExitType,
  normalizeReason,
  parseScore,
  parseOptionalBoolean,
  validateMappedRow,
  duplicateKey,
  type MappedExitHistoryRow,
} from "@/lib/desligamentos/importExitHistory";

function baseRow(overrides: Partial<MappedExitHistoryRow> = {}): MappedExitHistoryRow {
  return {
    userName: "Maria Teste",
    department: "",
    position: "",
    admissionDate: "",
    exitDate: "15/03/2024",
    exitType: "Voluntária",
    reason: "Pediu demissão",
    notes: "",
    rehireEligible: "",
    leaderName: "",
    environmentScore: "",
    leaderRelationshipScore: "",
    growthScore: "",
    benefitsScore: "",
    communicationScore: "",
    biggestChallenge: "",
    improvementSuggestion: "",
    wouldReturn: "",
    wouldRecommend: "",
    freeComment: "",
    ...overrides,
  };
}

describe("parseDateFlexible", () => {
  it("aceita formato ISO", () => {
    expect(parseDateFlexible("2024-03-15")?.toISOString().slice(0, 10)).toBe("2024-03-15");
  });

  it("aceita formato brasileiro DD/MM/YYYY", () => {
    expect(parseDateFlexible("15/03/2024")?.toISOString().slice(0, 10)).toBe("2024-03-15");
  });

  it("rejeita data inválida", () => {
    expect(parseDateFlexible("31/02/2024")).toBeNull();
    expect(parseDateFlexible("não é data")).toBeNull();
    expect(parseDateFlexible("")).toBeNull();
  });
});

describe("normalizeExitType / normalizeReason", () => {
  it("aceita a chave do enum ou o rótulo, case-insensitive", () => {
    expect(normalizeExitType("VOLUNTARIA")).toBe("VOLUNTARIA");
    expect(normalizeExitType("voluntária")).toBe("VOLUNTARIA");
    expect(normalizeExitType("involuntária")).toBe("INVOLUNTARIA");
    expect(normalizeExitType("outra coisa")).toBeNull();
  });

  it("normaliza motivo", () => {
    expect(normalizeReason("pediu demissão")).toBe("PEDIU_DEMISSAO");
    expect(normalizeReason("FIM_DE_CONTRATO")).toBe("FIM_DE_CONTRATO");
    expect(normalizeReason("inválido")).toBeNull();
  });
});

describe("parseScore", () => {
  it("aceita vazio como null", () => {
    expect(parseScore("")).toEqual({ ok: true, value: null });
  });
  it("aceita inteiro de 1 a 5", () => {
    expect(parseScore("3")).toEqual({ ok: true, value: 3 });
  });
  it("rejeita fora do range ou não inteiro", () => {
    expect(parseScore("0").ok).toBe(false);
    expect(parseScore("6").ok).toBe(false);
    expect(parseScore("3.5").ok).toBe(false);
    expect(parseScore("abc").ok).toBe(false);
  });
});

describe("parseOptionalBoolean", () => {
  it("aceita vazio como null", () => {
    expect(parseOptionalBoolean("")).toEqual({ ok: true, value: null });
  });
  it("reconhece valores em português e inglês", () => {
    expect(parseOptionalBoolean("Sim")).toEqual({ ok: true, value: true });
    expect(parseOptionalBoolean("não")).toEqual({ ok: true, value: false });
    expect(parseOptionalBoolean("yes")).toEqual({ ok: true, value: true });
    expect(parseOptionalBoolean("0")).toEqual({ ok: true, value: false });
  });
  it("rejeita valor não reconhecido", () => {
    expect(parseOptionalBoolean("talvez").ok).toBe(false);
  });
});

describe("validateMappedRow", () => {
  it("valida uma linha mínima válida sem dados de pesquisa", () => {
    const result = validateMappedRow(baseRow());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.employeeExit.userName).toBe("Maria Teste");
      expect(result.survey).toBeNull();
    }
  });

  it("monta o objeto de pesquisa quando há ao menos um campo preenchido", () => {
    const result = validateMappedRow(baseRow({ leaderName: "João", environmentScore: "4", wouldReturn: "sim" }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.survey).toEqual({
        leaderName: "João",
        environmentScore: 4,
        leaderRelationshipScore: null,
        growthScore: null,
        benefitsScore: null,
        communicationScore: null,
        biggestChallenge: null,
        improvementSuggestion: null,
        wouldReturn: true,
        wouldRecommend: null,
        freeComment: null,
      });
    }
  });

  it("rejeita nome vazio", () => {
    const result = validateMappedRow(baseRow({ userName: "  " }));
    expect(result.ok).toBe(false);
  });

  it("rejeita data de saída inválida", () => {
    const result = validateMappedRow(baseRow({ exitDate: "32/13/2024" }));
    expect(result.ok).toBe(false);
  });

  it("rejeita tipo de desligamento não reconhecido", () => {
    const result = validateMappedRow(baseRow({ exitType: "xyz" }));
    expect(result.ok).toBe(false);
  });

  it("rejeita nota de pesquisa fora do range", () => {
    const result = validateMappedRow(baseRow({ growthScore: "9" }));
    expect(result.ok).toBe(false);
  });
});

describe("duplicateKey", () => {
  it("normaliza nome (case/trim) e data para a mesma chave", () => {
    const k1 = duplicateKey("Maria Teste", new Date("2024-03-15T00:00:00.000Z"));
    const k2 = duplicateKey("  maria teste  ", new Date("2024-03-15T12:00:00.000Z"));
    expect(k1).toBe(k2);
  });
});

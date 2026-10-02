import { describe, expect, it } from "vitest";
import { parseThemeOutput, buildThemeInput } from "@/lib/exitSurvey/themeAnalysis";

describe("parseThemeOutput", () => {
  it("aceita um JSON válido com temas", () => {
    const raw = JSON.stringify({
      themes: [{ theme: "Carga de trabalho", count: 5, examples: ["muito cansativo", "excesso de horas"] }],
    });
    const result = parseThemeOutput(raw);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.themes[0].theme).toBe("Carga de trabalho");
      expect(result.data.themes[0].count).toBe(5);
    }
  });

  it("rejeita resposta que não é JSON", () => {
    expect(parseThemeOutput("não é json").ok).toBe(false);
  });

  it("rejeita JSON sem campo themes", () => {
    expect(parseThemeOutput(JSON.stringify({ foo: "bar" })).ok).toBe(false);
  });

  it("rejeita quando themes está vazio ou sem temas válidos", () => {
    expect(parseThemeOutput(JSON.stringify({ themes: [] })).ok).toBe(false);
    expect(parseThemeOutput(JSON.stringify({ themes: [{ theme: "", count: 1, examples: [] }] })).ok).toBe(false);
  });

  it("limita exemplos a 2 por tema", () => {
    const raw = JSON.stringify({
      themes: [{ theme: "X", count: 3, examples: ["a", "b", "c", "d"] }],
    });
    const result = parseThemeOutput(raw);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.themes[0].examples.length).toBe(2);
  });
});

describe("buildThemeInput", () => {
  it("numera os comentários", () => {
    const input = buildThemeInput(["ótimo lugar", "ambiente pesado"]);
    expect(input).toContain("Comentário 1: ótimo lugar");
    expect(input).toContain("Comentário 2: ambiente pesado");
  });
});

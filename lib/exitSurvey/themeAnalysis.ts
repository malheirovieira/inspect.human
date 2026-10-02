// Análise de tema dos comentários livres da pesquisa de saída (Fase 5) — só
// processa respostas com Consent ATIVO vinculado ao employeeExitId (nunca
// respostas importadas, Fase 4, que nunca têm Consent). NÃO gera
// recomendações de negócio — só agrupa temas recorrentes; a recomendação em
// si continua sendo texto livre escrito pelo RH (ver ExitAnalysisReport).

export const MIN_THEME_RESPONSES = 10;

export type ThemeAnalysisResult = {
  themes: { theme: string; count: number; examples: string[] }[];
};

export const THEME_JSON_SCHEMA = {
  type: "object",
  properties: {
    themes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          theme: { type: "string", description: "Nome curto do tema recorrente (ex.: 'Carga de trabalho excessiva')" },
          count: { type: "integer", description: "Quantos comentários mencionam esse tema" },
          examples: {
            type: "array",
            items: { type: "string" },
            description: "Até 2 trechos curtos (anonimizados) que ilustram o tema",
          },
        },
        required: ["theme", "count", "examples"],
      },
    },
  },
  required: ["themes"],
} as const;

export const THEME_SYSTEM_PROMPT =
  "Você analisa comentários livres de pesquisas de desligamento de RH. Identifique os " +
  "temas recorrentes mencionados pelos ex-colaboradores (ex.: liderança, carga de trabalho, " +
  "salário, clima). Agrupe por tema, conte quantos comentários mencionam cada um, e cite até " +
  "2 trechos curtos como exemplo. Nunca invente temas que não apareçam no texto. Nunca sugira " +
  "ações ou recomendações — só descreva o que foi dito.";

export function buildThemeInput(comments: string[]): string {
  return comments.map((c, i) => `Comentário ${i + 1}: ${c}`).join("\n\n");
}

export type ParseThemeOutcome = { ok: true; data: ThemeAnalysisResult } | { ok: false; reason: string };

export function parseThemeOutput(raw: string): ParseThemeOutcome {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "resposta não é JSON" };
  }
  if (typeof parsed !== "object" || parsed === null || !("themes" in parsed)) {
    return { ok: false, reason: "sem campo themes" };
  }
  const themes = (parsed as { themes: unknown }).themes;
  if (!Array.isArray(themes)) return { ok: false, reason: "themes não é array" };

  const normalized = themes
    .filter((t): t is Record<string, unknown> => typeof t === "object" && t !== null)
    .map((t) => ({
      theme: typeof t.theme === "string" ? t.theme : "",
      count: typeof t.count === "number" ? t.count : 0,
      examples: Array.isArray(t.examples) ? t.examples.filter((e): e is string => typeof e === "string").slice(0, 2) : [],
    }))
    .filter((t) => t.theme.length > 0);

  if (normalized.length === 0) return { ok: false, reason: "nenhum tema válido" };
  return { ok: true, data: { themes: normalized } };
}

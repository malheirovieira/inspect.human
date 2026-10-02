import { EXIT_TYPES, EXIT_TYPE_LABELS, EXIT_REASONS, EXIT_REASON_LABELS } from "@/schemas/employeeExit";

export type ImportFieldId =
  | "userName"
  | "department"
  | "position"
  | "admissionDate"
  | "exitDate"
  | "exitType"
  | "reason"
  | "notes"
  | "rehireEligible"
  | "leaderName"
  | "environmentScore"
  | "leaderRelationshipScore"
  | "growthScore"
  | "benefitsScore"
  | "communicationScore"
  | "biggestChallenge"
  | "improvementSuggestion"
  | "wouldReturn"
  | "wouldRecommend"
  | "freeComment";

export type ImportFieldDef = {
  id: ImportFieldId;
  label: string;
  required: boolean;
  // Só faz sentido oferecer "valor fixo pra todo o lote" em campos enum
  // obrigatórios — planilhas de histórico antigas às vezes nem têm essa
  // coluna (ex. todo mundo foi importado como "Desligamento voluntário").
  allowFixedValue?: boolean;
  group: "Desligamento" | "Pesquisa";
};

export const EXIT_HISTORY_IMPORT_FIELDS: ImportFieldDef[] = [
  { id: "userName", label: "Nome do colaborador", required: true, group: "Desligamento" },
  { id: "exitDate", label: "Data de saída", required: true, group: "Desligamento" },
  { id: "exitType", label: "Tipo de desligamento", required: true, allowFixedValue: true, group: "Desligamento" },
  { id: "reason", label: "Motivo", required: true, allowFixedValue: true, group: "Desligamento" },
  { id: "department", label: "Setor", required: false, group: "Desligamento" },
  { id: "position", label: "Cargo", required: false, group: "Desligamento" },
  { id: "admissionDate", label: "Data de admissão", required: false, group: "Desligamento" },
  { id: "notes", label: "Observações", required: false, group: "Desligamento" },
  { id: "rehireEligible", label: "Elegível para recontratação (sim/não)", required: false, group: "Desligamento" },
  { id: "leaderName", label: "Líder direto", required: false, group: "Pesquisa" },
  { id: "environmentScore", label: "Ambiente (1-5)", required: false, group: "Pesquisa" },
  { id: "leaderRelationshipScore", label: "Relação com o líder (1-5)", required: false, group: "Pesquisa" },
  { id: "growthScore", label: "Crescimento (1-5)", required: false, group: "Pesquisa" },
  { id: "benefitsScore", label: "Benefícios (1-5)", required: false, group: "Pesquisa" },
  { id: "communicationScore", label: "Comunicação (1-5)", required: false, group: "Pesquisa" },
  { id: "biggestChallenge", label: "Maior desafio", required: false, group: "Pesquisa" },
  { id: "improvementSuggestion", label: "Sugestão de melhoria", required: false, group: "Pesquisa" },
  { id: "wouldReturn", label: "Voltaria a trabalhar na empresa (sim/não)", required: false, group: "Pesquisa" },
  { id: "wouldRecommend", label: "Recomendaria a empresa (sim/não)", required: false, group: "Pesquisa" },
  { id: "freeComment", label: "Comentário livre", required: false, group: "Pesquisa" },
];

const SURVEY_FIELD_IDS: ImportFieldId[] = [
  "leaderName",
  "environmentScore",
  "leaderRelationshipScore",
  "growthScore",
  "benefitsScore",
  "communicationScore",
  "biggestChallenge",
  "improvementSuggestion",
  "wouldReturn",
  "wouldRecommend",
  "freeComment",
];

export type MappedExitHistoryRow = Record<ImportFieldId, string>;

const MONTH_NAMES: Record<string, number> = {
  janeiro: 1,
  fevereiro: 2,
  "março": 3,
  marco: 3,
  abril: 4,
  maio: 5,
  junho: 6,
  julho: 7,
  agosto: 8,
  setembro: 9,
  outubro: 10,
  novembro: 11,
  dezembro: 12,
};

function buildUtcDate(day: number, month: number, year: number): Date | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(d.getTime())) return null;
  if (d.getUTCDate() !== day || d.getUTCMonth() !== month - 1) return null;
  return d;
}

// Planilhas migradas de Google Forms/Excel trazem datas em formatos bem
// variados (separador /, -, ., espaço, nome do mês por extenso, sem
// separador nenhum) — tentamos reconhecer os mais comuns; o que não bater
// em nenhum padrão vira erro de linha (não trava o resto da importação).
export function parseDateFlexible(raw: string): Date | null {
  let trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const d = new Date(trimmed);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // "dia 23/6/2026" / "dia 08 de abril 2026" — remove ruído antes de testar.
  trimmed = trimmed.replace(/^dia\s+/, "").trim();

  const numericMatch = trimmed.match(/^(\d{1,2})[^\d](\d{1,2})[^\d](\d{4})$/);
  if (numericMatch) {
    const [, day, month, year] = numericMatch;
    return buildUtcDate(Number(day), Number(month), Number(year));
  }

  const eightDigits = trimmed.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (eightDigits) {
    const [, day, month, year] = eightDigits;
    return buildUtcDate(Number(day), Number(month), Number(year));
  }

  // "08 de abril de 2026" / "08 de abril 2026" / "13 de março 2026"
  const monthNameMatch = trimmed
    .replace(/\//g, " ")
    .match(/^(\d{1,2})\s*(?:de\s+)?([a-zç]+)\s*(?:de\s+)?(\d{4})$/);
  if (monthNameMatch) {
    const [, day, monthName, year] = monthNameMatch;
    const month = MONTH_NAMES[monthName];
    if (month) return buildUtcDate(Number(day), month, Number(year));
  }

  return null;
}

const EXIT_TYPE_SYNONYMS: Record<string, (typeof EXIT_TYPES)[number]> = {
  "pedi o desligamento": "VOLUNTARIA",
  "pedi demissao": "VOLUNTARIA",
  "fui desligado(a)": "INVOLUNTARIA",
  "fui desligada": "INVOLUNTARIA",
  "fui desligado": "INVOLUNTARIA",
};

export function normalizeExitType(raw: string): (typeof EXIT_TYPES)[number] | null {
  const v = raw.trim().toUpperCase();
  if (!v) return null;
  const byKey = EXIT_TYPES.find((t) => t === v);
  if (byKey) return byKey;
  const byLabel = EXIT_TYPES.find((t) => EXIT_TYPE_LABELS[t].toUpperCase() === v);
  if (byLabel) return byLabel;
  return EXIT_TYPE_SYNONYMS[v.toLowerCase()] ?? null;
}

export function normalizeReason(raw: string): (typeof EXIT_REASONS)[number] | null {
  const v = raw.trim().toUpperCase();
  if (!v) return null;
  const byKey = EXIT_REASONS.find((r) => r === v);
  if (byKey) return byKey;
  return EXIT_REASONS.find((r) => EXIT_REASON_LABELS[r].toUpperCase() === v) ?? null;
}

export type ParsedOptionalInt = { ok: true; value: number | null } | { ok: false };

// Nem toda planilha usa número 1-5 — formulários (ex. Google Forms) costumam
// usar rótulos qualitativos num mesmo espectro de 5 pontos. Aceita os dois.
const QUALITATIVE_SCORE_LABELS: Record<string, number> = {
  "muito ruim": 1,
  "muito ruins": 1,
  ruim: 2,
  ruins: 2,
  regular: 3,
  "mais ou menos": 3,
  bom: 4,
  bons: 4,
  "muito bom": 5,
  "muito bons": 5,
  excelente: 5,
};

export function parseScore(raw: string): ParsedOptionalInt {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, value: null };

  const label = QUALITATIVE_SCORE_LABELS[trimmed.toLowerCase()];
  if (label !== undefined) return { ok: true, value: label };

  const n = Number(trimmed);
  if (!Number.isInteger(n) || n < 1 || n > 5) return { ok: false };
  return { ok: true, value: n };
}

export type ParsedOptionalBool = { ok: true; value: boolean | null } | { ok: false };

const TRUE_VALUES = new Set([
  "sim",
  "s",
  "yes",
  "y",
  "true",
  "1",
  "com certeza sim",
  "sim, com certeza",
]);
const FALSE_VALUES = new Set([
  "não",
  "nao",
  "n",
  "no",
  "false",
  "0",
  "não voltaria",
  "nao voltaria",
  "não recomendaria",
  "nao recomendaria",
]);
// Resposta intermediária ("talvez"/"em partes") não tem representação fiel
// num booleano opcional — tratamos como "sem resposta" (null) em vez de
// rejeitar a linha inteira por causa disso.
const NEUTRAL_VALUES = new Set(["talvez", "em partes"]);

export function parseOptionalBoolean(raw: string): ParsedOptionalBool {
  const v = raw.trim().toLowerCase();
  if (!v) return { ok: true, value: null };
  if (NEUTRAL_VALUES.has(v)) return { ok: true, value: null };
  if (TRUE_VALUES.has(v)) return { ok: true, value: true };
  if (FALSE_VALUES.has(v)) return { ok: true, value: false };
  return { ok: false };
}

export type ValidatedEmployeeExit = {
  userName: string;
  department: string | null;
  position: string | null;
  admissionDate: Date | null;
  exitDate: Date;
  exitType: (typeof EXIT_TYPES)[number];
  reason: (typeof EXIT_REASONS)[number];
  notes: string | null;
  rehireEligible: boolean | null;
};

export type ValidatedSurveyResponse = {
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
  freeComment: string | null;
};

export type ValidateRowResult =
  | { ok: true; employeeExit: ValidatedEmployeeExit; survey: ValidatedSurveyResponse | null }
  | { ok: false; error: string };

function emptyToNull(raw: string): string | null {
  const trimmed = raw.trim();
  return trimmed ? trimmed : null;
}

export function validateMappedRow(row: MappedExitHistoryRow): ValidateRowResult {
  const userName = row.userName.trim();
  if (!userName) return { ok: false, error: "Nome do colaborador vazio" };

  const exitDate = parseDateFlexible(row.exitDate);
  if (!exitDate) return { ok: false, error: `Data de saída inválida ("${row.exitDate}")` };

  const exitType = normalizeExitType(row.exitType);
  if (!exitType) return { ok: false, error: `Tipo de desligamento inválido ("${row.exitType}")` };

  // Planilhas de Google Forms costumam trazer o motivo como texto livre
  // multi-seleção (ex. "Consegui outro emprego, Ambiente difícil"), que
  // raramente bate com um único valor do nosso enum. Em vez de rejeitar a
  // linha, cai em "Outro" e preserva o texto original nas observações.
  const reasonRaw = row.reason.trim();
  if (!reasonRaw) return { ok: false, error: "Motivo vazio" };
  const reasonMatch = normalizeReason(reasonRaw);
  const reason = reasonMatch ?? "OUTRO";
  const reasonNote = reasonMatch ? null : `Motivo original da planilha: ${reasonRaw}`;

  const admissionDateRaw = row.admissionDate ?? "";
  let admissionDate: Date | null = null;
  if (admissionDateRaw.trim()) {
    admissionDate = parseDateFlexible(admissionDateRaw);
    if (!admissionDate) return { ok: false, error: `Data de admissão inválida ("${admissionDateRaw}")` };
  }

  const rehireParsed = parseOptionalBoolean(row.rehireEligible ?? "");
  if (!rehireParsed.ok) return { ok: false, error: `Valor inválido em "elegível para recontratação" ("${row.rehireEligible}")` };

  const scoreFields: { id: ImportFieldId; label: string }[] = [
    { id: "environmentScore", label: "ambiente" },
    { id: "leaderRelationshipScore", label: "relação com o líder" },
    { id: "growthScore", label: "crescimento" },
    { id: "benefitsScore", label: "benefícios" },
    { id: "communicationScore", label: "comunicação" },
  ];
  const scores: Record<string, number | null> = {};
  for (const field of scoreFields) {
    const parsed = parseScore(row[field.id] ?? "");
    if (!parsed.ok) return { ok: false, error: `Nota inválida em "${field.label}" ("${row[field.id]}") — use 1 a 5` };
    scores[field.id] = parsed.value;
  }

  const wouldReturnParsed = parseOptionalBoolean(row.wouldReturn ?? "");
  if (!wouldReturnParsed.ok) return { ok: false, error: `Valor inválido em "voltaria a trabalhar" ("${row.wouldReturn}")` };
  const wouldRecommendParsed = parseOptionalBoolean(row.wouldRecommend ?? "");
  if (!wouldRecommendParsed.ok) return { ok: false, error: `Valor inválido em "recomendaria a empresa" ("${row.wouldRecommend}")` };

  const notesParts = [emptyToNull(row.notes ?? ""), reasonNote].filter((p): p is string => Boolean(p));

  const employeeExit: ValidatedEmployeeExit = {
    userName,
    department: emptyToNull(row.department ?? ""),
    position: emptyToNull(row.position ?? ""),
    admissionDate,
    exitDate,
    exitType,
    reason,
    notes: notesParts.length > 0 ? notesParts.join(" | ") : null,
    rehireEligible: rehireParsed.value,
  };

  const hasSurveyData = SURVEY_FIELD_IDS.some((id) => (row[id] ?? "").trim() !== "");
  const survey: ValidatedSurveyResponse | null = hasSurveyData
    ? {
        leaderName: emptyToNull(row.leaderName ?? ""),
        environmentScore: scores.environmentScore,
        leaderRelationshipScore: scores.leaderRelationshipScore,
        growthScore: scores.growthScore,
        benefitsScore: scores.benefitsScore,
        communicationScore: scores.communicationScore,
        biggestChallenge: emptyToNull(row.biggestChallenge ?? ""),
        improvementSuggestion: emptyToNull(row.improvementSuggestion ?? ""),
        wouldReturn: wouldReturnParsed.value,
        wouldRecommend: wouldRecommendParsed.value,
        freeComment: emptyToNull(row.freeComment ?? ""),
      }
    : null;

  return { ok: true, employeeExit, survey };
}

export function duplicateKey(userName: string, exitDate: Date): string {
  return `${userName.trim().toLowerCase()}|${exitDate.toISOString().slice(0, 10)}`;
}

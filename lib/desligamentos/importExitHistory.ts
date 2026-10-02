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

export function parseDateFlexible(raw: string): Date | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const d = new Date(trimmed);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const brMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (brMatch) {
    const [, day, month, year] = brMatch;
    const d = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    if (Number.isNaN(d.getTime())) return null;
    if (d.getUTCDate() !== Number(day) || d.getUTCMonth() !== Number(month) - 1) return null;
    return d;
  }

  return null;
}

export function normalizeExitType(raw: string): (typeof EXIT_TYPES)[number] | null {
  const v = raw.trim().toUpperCase();
  if (!v) return null;
  const byKey = EXIT_TYPES.find((t) => t === v);
  if (byKey) return byKey;
  return EXIT_TYPES.find((t) => EXIT_TYPE_LABELS[t].toUpperCase() === v) ?? null;
}

export function normalizeReason(raw: string): (typeof EXIT_REASONS)[number] | null {
  const v = raw.trim().toUpperCase();
  if (!v) return null;
  const byKey = EXIT_REASONS.find((r) => r === v);
  if (byKey) return byKey;
  return EXIT_REASONS.find((r) => EXIT_REASON_LABELS[r].toUpperCase() === v) ?? null;
}

export type ParsedOptionalInt = { ok: true; value: number | null } | { ok: false };

export function parseScore(raw: string): ParsedOptionalInt {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, value: null };
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n < 1 || n > 5) return { ok: false };
  return { ok: true, value: n };
}

export type ParsedOptionalBool = { ok: true; value: boolean | null } | { ok: false };

const TRUE_VALUES = new Set(["sim", "s", "yes", "y", "true", "1"]);
const FALSE_VALUES = new Set(["não", "nao", "n", "no", "false", "0"]);

export function parseOptionalBoolean(raw: string): ParsedOptionalBool {
  const v = raw.trim().toLowerCase();
  if (!v) return { ok: true, value: null };
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

  const reason = normalizeReason(row.reason);
  if (!reason) return { ok: false, error: `Motivo inválido ("${row.reason}")` };

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

  const employeeExit: ValidatedEmployeeExit = {
    userName,
    department: emptyToNull(row.department ?? ""),
    position: emptyToNull(row.position ?? ""),
    admissionDate,
    exitDate,
    exitType,
    reason,
    notes: emptyToNull(row.notes ?? ""),
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

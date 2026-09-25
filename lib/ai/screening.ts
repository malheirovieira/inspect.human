import { z } from "zod";

// Contrato da triagem com IA: instruções, schema enviado ao provedor e
// validação da resposta. Mudou o prompt ou o schema? Suba PROMPT_VERSION
// (fica gravado em cada análise via result.promptVersion).
export const PROMPT_VERSION = "2026-09-v2";

export const SUMMARY_MAX_SENTENCES = 3;
export const SUMMARY_MAX_CHARS = 600;
export const BASIS_MAX_CHARS = 200;
export const MAX_SKILLS = 8;
export const SKILL_MAX_CHARS = 40;
export const MAX_ROLES = 3;

export const SCREENING_SYSTEM_PROMPT = `Você resume currículos para apoiar a triagem de um recrutador. Responda em português do Brasil, somente com o JSON pedido.

Regras obrigatórias:
- Use apenas fatos presentes no currículo. Se uma informação não estiver no currículo, retorne null (ou lista vazia) em vez de supor.
- Não infira nem mencione idade, gênero, raça, cor, etnia, religião, estado civil, saúde, deficiência, gravidez ou aparência.
- Não dê nota, pontuação, ranking, comparação com outros candidatos nem recomendação de aprovar, reprovar ou contratar. A decisão é sempre do recrutador.
- Marcadores entre colchetes, como [NOME], [E-MAIL], [TELEFONE], [ENDEREÇO], [LINK] e [DADO PESSOAL], indicam dados removidos de propósito: ignore-os e não tente deduzi-los.

Campos:
- resumo: no máximo 3 frases e 600 caracteres, objetivas, sobre a trajetória profissional descrita.
- experienciaAnos: total de anos de experiência profissional, somando os períodos informados (pode ter uma casa decimal). null se os períodos não estiverem no currículo.
- experienciaBase: uma frase curta (até 200 caracteres) dizendo de onde veio o número, sem listar cada período (ex.: "Soma dos períodos de 2016 a 2024 informados."). null se experienciaAnos for null.
- competencias: até 8 tags curtas (1 a 3 palavras) de competências técnicas ou profissionais citadas no currículo.
- ultimosCargos: até 3 cargos mais recentes, do mais novo para o mais antigo, com a empresa (null se não informada).
- formacao: a maior formação acadêmica informada (ex.: "Bacharelado em Administração"). null se não houver.`;

export function buildScreeningInput(redactedText: string): string {
  return `Currículo (dados de contato já removidos):\n\n${redactedText}`;
}

// JSON Schema enviado ao provedor (Gemini: response_format.schema; OpenAI:
// text.format json_schema strict). Limites de tamanho ficam na descrição e
// no prompt; a resposta é AJUSTADA a eles em normalizeScreeningOutput — nem
// todo provedor aceita maxItems em modo estrito. Opcional = anyOf com null
// (todos os campos "required", como o modo estrito da OpenAI exige).
const nullable = (schema: object) => ({ anyOf: [schema, { type: "null" }] });

export const SCREENING_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["resumo", "experienciaAnos", "experienciaBase", "competencias", "ultimosCargos", "formacao"],
  properties: {
    resumo: { type: "string", description: "No máximo 3 frases e 600 caracteres, só com fatos do currículo." },
    experienciaAnos: nullable({ type: "number", description: "Anos de experiência profissional somados." }),
    experienciaBase: nullable({ type: "string", description: "Frase curta (até 200 caracteres) explicando de onde veio o número." }),
    competencias: {
      type: "array",
      description: "Até 8 tags curtas.",
      items: { type: "string" },
    },
    ultimosCargos: {
      type: "array",
      description: "Até 3 cargos mais recentes.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["cargo", "empresa"],
        properties: {
          cargo: { type: "string" },
          empresa: nullable({ type: "string" }),
        },
      },
    },
    formacao: nullable({ type: "string", description: "Maior formação acadêmica informada." }),
  },
} as const;

// ---- frases ---------------------------------------------------------------

// Palavra antes do ponto que NÃO encerra frase: letra solta ("T.I.",
// "S.A."), abreviações comuns ("Ltda.", "Sr.", "Jr.", "etc.", "nº.").
const ABBREVIATION = /(?:^|[\s(])(?:\p{L}|sr|sra|srta|dr|dra|jr|prof|profa|eng|ltda|cia|av|n[ºo°]|ex|obs|vs|etc|aprox|ref)$/iu;

// Divide em frases. Só é fim de frase: [.!?] + espaço + começo em maiúscula,
// dígito ou aspas — e a palavra antes do ponto não é abreviação. Assim
// "Profissional de T.I. com experiência" continua sendo UMA frase.
export function splitSentences(text: string): string[] {
  const sentences: string[] = [];
  const boundary = /[.!?]+(?=\s+["“'(]?[\p{Lu}\d])/gu;
  let start = 0;
  for (const m of text.matchAll(boundary)) {
    const end = m.index! + m[0].length;
    const before = text.slice(start, m.index!);
    if (m[0] === "." && ABBREVIATION.test(before)) continue;
    sentences.push(text.slice(start, end).trim());
    start = end;
  }
  const rest = text.slice(start).trim();
  if (rest) sentences.push(rest);
  return sentences;
}

// Corta um texto no limite de caracteres terminando numa frase completa; se
// nem a primeira frase cabe, corta na última palavra e põe "…".
export function clampText(text: string, maxChars: number, maxSentences = Infinity): string {
  const sentences = splitSentences(text.trim().replace(/\s+/g, " ")).slice(0, maxSentences);
  let out = sentences.join(" ");
  while (out.length > maxChars && sentences.length > 1) {
    sentences.pop();
    out = sentences.join(" ");
  }
  if (out.length <= maxChars) return out;
  const cut = out.slice(0, maxChars - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > maxChars * 0.5 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.–-]+$/, "")}…`;
}

// ---- normalização tolerante -----------------------------------------------

export type ScreeningResult = {
  resumo: string;
  experienciaAnos: number | null;
  experienciaBase: string | null;
  competencias: string[];
  ultimosCargos: { cargo: string; empresa: string | null }[];
  formacao: string | null;
};

const text = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim().replace(/\s+/g, " ") : null);

// Tags sem duplicata (ignorando maiúsculas/acentos), mantendo a 1ª grafia.
export function dedupeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const tag = raw.trim().replace(/\s+/g, " ");
    const key = tag.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }
  return out;
}

function toYears(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v.replace(",", ".")) : NaN;
  if (!Number.isFinite(n) || n < 0 || n > 60) return null;
  return Math.round(n * 10) / 10;
}

// Resposta crua (já em JSON) → resultado dentro dos limites. AJUSTA em vez
// de rejeitar tudo o que não afeta privacidade nem segurança:
// - resumo com mais de 3 frases / 600 caracteres → corta numa frase completa;
// - base da experiência longa → corta (mesma regra, 200 caracteres);
// - tag com mais de 40 caracteres → descarta só essa tag; mais de 8 → as 8 primeiras;
// - mais de 3 cargos → os 3 primeiros; cargo sem nome → descartado;
// - experiência fora de 0–60 ou não numérica → null;
// - campos extras → ignorados (nunca gravados).
// Rejeita (null) só se faltar o campo ESSENCIAL: o resumo.
export function normalizeScreeningOutput(json: unknown): ScreeningResult | null {
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  const o = json as Record<string, unknown>;

  const resumo = text(o.resumo);
  if (!resumo) return null;

  const experienciaAnos = toYears(o.experienciaAnos);
  const base = text(o.experienciaBase);

  const rawSkills = Array.isArray(o.competencias)
    ? o.competencias
    : typeof o.competencias === "string"
      ? o.competencias.split(/[,;]/)
      : [];
  const competencias = dedupeTags(
    rawSkills.map((s) => text(s)).filter((s): s is string => s !== null && s.length <= SKILL_MAX_CHARS)
  ).slice(0, MAX_SKILLS);

  const ultimosCargos = (Array.isArray(o.ultimosCargos) ? o.ultimosCargos : [])
    .map((c) => {
      const r = (c ?? {}) as Record<string, unknown>;
      const cargo = text(r.cargo);
      const empresa = text(r.empresa);
      return cargo ? { cargo: clampText(cargo, 100), empresa: empresa ? clampText(empresa, 100) : null } : null;
    })
    .filter((c): c is { cargo: string; empresa: string | null } => c !== null)
    .slice(0, MAX_ROLES);

  const formacao = text(o.formacao);

  return {
    resumo: clampText(resumo, SUMMARY_MAX_CHARS, SUMMARY_MAX_SENTENCES),
    experienciaAnos,
    experienciaBase: experienciaAnos === null || !base ? null : clampText(base, BASIS_MAX_CHARS),
    competencias,
    ultimosCargos,
    formacao: formacao ? clampText(formacao, 200) : null,
  };
}

// Contrato FINAL do que é gravado — a normalização acima sempre produz algo
// que passa aqui; é a rede de segurança se alguém mexer nela.
export const screeningResultSchema = z
  .object({
    resumo: z
      .string()
      .min(1)
      .max(SUMMARY_MAX_CHARS)
      .refine((s) => splitSentences(s).length <= SUMMARY_MAX_SENTENCES, "resumo com mais de 3 frases"),
    experienciaAnos: z.number().min(0).max(60).nullable(),
    experienciaBase: z.string().max(BASIS_MAX_CHARS).nullable(),
    competencias: z.array(z.string().min(1).max(SKILL_MAX_CHARS)).max(MAX_SKILLS),
    ultimosCargos: z
      .array(z.object({ cargo: z.string().min(1).max(100), empresa: z.string().max(100).nullable() }).strict())
      .max(MAX_ROLES),
    formacao: z.string().max(200).nullable(),
  })
  .strict();

// ---- termos proibidos -----------------------------------------------------

// Palavra INTEIRA com acento: \b do JavaScript trata "ç"/"ã" como fora de
// palavra, então usamos "não há letra antes/depois" (\p{L}, flag u).
const word = (source: string) => new RegExp(`(?<!\\p{L})(?:${source})(?!\\p{L})`, "iu");

// Rede de segurança pro texto LIVRE que a IA escreve (resumo e base da
// experiência): atributo protegido ou recomendação/nota invalida a resposta.
// Competências, cargos e formação são fatos copiados do currículo e ficam de
// fora (ex.: "Enfermagem em Saúde da Mulher" é legítimo).
const FORBIDDEN_IN_FREE_TEXT: { pattern: RegExp; label: string }[] = [
  { pattern: word("idade|anos de idade|idos[oa]"), label: "idade" },
  { pattern: word("gênero|genero|sexo"), label: "gênero" },
  { pattern: word("raça|raca|etnia|cor da pele"), label: "raça" },
  { pattern: word("religião|religiao|religios[oa]"), label: "religião" },
  { pattern: word("estado civil|solteir[oa]|casad[oa]|divorciad[oa]|viúv[oa]|viuv[oa]"), label: "estado civil" },
  { pattern: word("doença|doenca|problema de saúde|condição de saúde|grávida|gravida|gestante"), label: "saúde" },
  { pattern: word("deficiência|deficiencia|deficiente|PcD"), label: "deficiência" },
  { pattern: word("aparência|aparencia|aspecto físico"), label: "aparência" },
  { pattern: word("nota \\d+|pontuação|pontuacao|ranking|classificação|classificacao"), label: "nota" },
  {
    pattern: word(
      "recomendo|recomendamos|recomenda-se|recomendad[oa]|aprovar|reprovar|contratar|descartar|candidat[oa] (?:ideal|forte|frac[oa]|adequad[oa]|inadequad[oa])"
    ),
    label: "recomendação",
  },
];

export function findForbiddenContent(result: Pick<ScreeningResult, "resumo" | "experienciaBase">): string | null {
  const freeText = [result.resumo, result.experienciaBase ?? ""].join("\n");
  return FORBIDDEN_IN_FREE_TEXT.find((f) => f.pattern.test(freeText))?.label ?? null;
}

// ---- entrada única --------------------------------------------------------

export type ParseOutcome = { ok: true; data: ScreeningResult } | { ok: false; reason: string };

// Texto cru do provedor → resultado ajustado e validado. Nunca lança. Só
// REJEITA quando: não é JSON, falta o resumo, ou há termo proibido. O
// `reason` é técnico e sem conteúdo do currículo (vai pra last_error).
export function parseScreeningOutput(raw: string): ParseOutcome {
  let json: unknown;
  try {
    // Alguns modelos embrulham em ```json … ``` mesmo pedindo JSON puro.
    json = JSON.parse(raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    return { ok: false, reason: raw.trim() ? "resposta não é JSON válido" : "resposta vazia" };
  }
  const normalized = normalizeScreeningOutput(json);
  if (!normalized) return { ok: false, reason: "campo essencial ausente: resumo" };

  const forbidden = findForbiddenContent(normalized);
  if (forbidden) return { ok: false, reason: `termo proibido no texto da IA: ${forbidden}` };

  const checked = screeningResultSchema.safeParse(normalized);
  if (!checked.success) {
    const issue = checked.error.issues[0];
    return { ok: false, reason: `formato: ${issue?.path.join(".") || "?"} — ${issue?.message ?? "inválido"}` };
  }
  return { ok: true, data: checked.data };
}

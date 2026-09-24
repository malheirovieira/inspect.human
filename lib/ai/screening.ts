import { z } from "zod";

// Contrato da triagem com IA: instruções, schema enviado ao provedor e
// validação da resposta. Mudou o prompt ou o schema? Suba PROMPT_VERSION
// (fica gravado em cada análise via result.promptVersion).
export const PROMPT_VERSION = "2026-09-v1";

export const SCREENING_SYSTEM_PROMPT = `Você resume currículos para apoiar a triagem de um recrutador. Responda em português do Brasil, somente com o JSON pedido.

Regras obrigatórias:
- Use apenas fatos presentes no currículo. Se uma informação não estiver no currículo, retorne null (ou lista vazia) em vez de supor.
- Não infira nem mencione idade, gênero, raça, cor, etnia, religião, estado civil, saúde, deficiência, gravidez ou aparência.
- Não dê nota, pontuação, ranking, comparação com outros candidatos nem recomendação de aprovar, reprovar ou contratar. A decisão é sempre do recrutador.
- Marcadores entre colchetes, como [NOME], [E-MAIL], [TELEFONE], [ENDEREÇO], [LINK] e [DADO PESSOAL], indicam dados removidos de propósito: ignore-os e não tente deduzi-los.

Campos:
- resumo: no máximo 3 frases, objetivas, sobre a trajetória profissional descrita.
- experienciaAnos: total de anos de experiência profissional, somando os períodos informados (pode ter uma casa decimal). null se os períodos não estiverem no currículo.
- experienciaBase: uma frase curta dizendo de onde veio o número (ex.: "Soma dos períodos de 2016 a 2024 informados."). null se experienciaAnos for null.
- competencias: até 8 tags curtas (1 a 3 palavras) de competências técnicas ou profissionais citadas no currículo.
- ultimosCargos: até 3 cargos mais recentes, do mais novo para o mais antigo, com a empresa (null se não informada).
- formacao: a maior formação acadêmica informada (ex.: "Bacharelado em Administração"). null se não houver.`;

export function buildScreeningInput(redactedText: string): string {
  return `Currículo (dados de contato já removidos):\n\n${redactedText}`;
}

// JSON Schema enviado ao provedor (Gemini: response_format.schema; OpenAI:
// text.format json_schema strict). Limites de tamanho ficam na descrição e
// são garantidos pelo zod abaixo — nem todo provedor aceita maxItems em
// modo estrito. Opcional = anyOf com null (todos os campos "required", como
// o modo estrito da OpenAI exige).
const nullable = (schema: object) => ({ anyOf: [schema, { type: "null" }] });

export const SCREENING_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["resumo", "experienciaAnos", "experienciaBase", "competencias", "ultimosCargos", "formacao"],
  properties: {
    resumo: { type: "string", description: "No máximo 3 frases, só com fatos do currículo." },
    experienciaAnos: nullable({ type: "number", description: "Anos de experiência profissional somados." }),
    experienciaBase: nullable({ type: "string", description: "Frase curta explicando de onde veio o número." }),
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

function sentenceCount(text: string): number {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean).length;
}

const emptyToNull = (v: string | null) => (v && v.trim() ? v.trim() : null);

export const screeningResultSchema = z
  .object({
    resumo: z
      .string()
      .trim()
      .min(1)
      .max(600)
      .refine((s) => sentenceCount(s) <= 3, "resumo com mais de 3 frases"),
    experienciaAnos: z.number().min(0).max(60).nullable(),
    experienciaBase: z.string().max(200).nullable().transform(emptyToNull),
    competencias: z.array(z.string().trim().min(1).max(40)).max(8),
    ultimosCargos: z
      .array(
        z.object({
          cargo: z.string().trim().min(1).max(100),
          empresa: z.string().max(100).nullable().transform(emptyToNull),
        })
      )
      .max(3),
    formacao: z.string().max(200).nullable().transform(emptyToNull),
  })
  .strict()
  .transform((r) => ({
    ...r,
    experienciaAnos: r.experienciaAnos === null ? null : Math.round(r.experienciaAnos * 10) / 10,
    experienciaBase: r.experienciaAnos === null ? null : r.experienciaBase,
    competencias: dedupeTags(r.competencias),
  }));

export type ScreeningResult = z.infer<typeof screeningResultSchema>;

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

// Rede de segurança pro texto LIVRE que a IA escreve (resumo e base da
// experiência): menção a atributo protegido ou recomendação/nota invalida a
// resposta (conta como falha de validação). Competências, cargos e formação
// são fatos copiados do currículo e ficam de fora (ex.: "Enfermagem em
// Saúde da Mulher" é legítimo).
const FORBIDDEN_IN_FREE_TEXT: { pattern: RegExp; label: string }[] = [
  { pattern: /\bidade\b|\banos de idade\b|\bid[oa]s[oa]\b/i, label: "idade" },
  { pattern: /\bg[êe]nero\b|\bsexo\b/i, label: "gênero" },
  { pattern: /\bra[çc]a\b|\betnia\b|\bcor da pele\b/i, label: "raça" },
  { pattern: /\breligi[ãa]o\b|\breligios[oa]\b/i, label: "religião" },
  { pattern: /\bestado civil\b|\b(?:solteir|casad|divorciad|vi[úu]v)[oa]\b/i, label: "estado civil" },
  { pattern: /\bdoen[çc]a\b|\bproblema de sa[úu]de\b|\bcondi[çc][ãa]o de sa[úu]de\b|\bgr[áa]vid|\bgestante\b/i, label: "saúde" },
  { pattern: /\bdefici[êe]ncia\b|\bdeficiente\b|\bPcD\b/i, label: "deficiência" },
  { pattern: /\bapar[êe]ncia\b|\baspecto f[íi]sico\b/i, label: "aparência" },
  { pattern: /\bnota\s+\d|\bpontua[çc][ãa]o\b|\branking\b|\bclassifica[çc][ãa]o\b/i, label: "nota" },
  {
    pattern: /\brecomend(?:o|amos|a-se|ad[oa])\b|\b(?:aprovar|reprovar|contratar|descartar)\b|\bcandidat[oa]\s+(?:ideal|forte|fraco|fraca|adequad[oa]|inadequad[oa])\b/i,
    label: "recomendação",
  },
];

export function findForbiddenContent(result: ScreeningResult): string | null {
  const freeText = [result.resumo, result.experienciaBase ?? ""].join("\n");
  return FORBIDDEN_IN_FREE_TEXT.find((f) => f.pattern.test(freeText))?.label ?? null;
}

export type ParseOutcome = { ok: true; data: ScreeningResult } | { ok: false; reason: string };

// Texto cru do provedor → resultado validado. Nunca lança.
export function parseScreeningOutput(raw: string): ParseOutcome {
  let json: unknown;
  try {
    // Alguns modelos embrulham em ```json … ``` mesmo pedindo JSON puro.
    json = JSON.parse(raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    return { ok: false, reason: "resposta não é JSON" };
  }
  const parsed = screeningResultSchema.safeParse(json);
  if (!parsed.success) return { ok: false, reason: `schema: ${parsed.error.issues[0]?.message ?? "inválido"}` };
  const forbidden = findForbiddenContent(parsed.data);
  if (forbidden) return { ok: false, reason: `conteúdo proibido: ${forbidden}` };
  return { ok: true, data: parsed.data };
}

// Minimização de dados ANTES de enviar texto de currículo a um provedor de
// IA. Remove: e-mail, telefone, CPF, RG, endereço/CEP, todos os links e
// @handles, o nome do candidato e linhas com dado pessoal rotulado
// (nascimento, idade, estado civil, sexo, nacionalidade). A instrução do
// prompt proíbe falar disso, mas aqui o dado nem chega ao provedor.
//
// É heurística: prefere remover demais a deixar passar. Cada marcador
// ([E-MAIL] etc.) avisa a IA que ali havia um dado retirado.

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
// Qualquer URL — não só redes sociais: portfólio/site pessoal também identifica.
const URL = /\b(?:https?:\/\/|www\.)[^\s<>()]+/gi;
const SOCIAL_BARE =
  /\b(?:linkedin\.com|github\.com|gitlab\.com|instagram\.com|facebook\.com|fb\.com|twitter\.com|x\.com|tiktok\.com|youtube\.com|behance\.net|dribbble\.com|medium\.com|wa\.me|t\.me)\/[^\s<>()]*/gi;
// @usuario solto (depois do e-mail, pra não pegar o domínio dele).
const HANDLE = /(^|[\s(])@[A-Za-z0-9_.]{2,30}\b/g;

const CPF_FORMATTED = /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g;
const RG_LABELED =
  /\b(?:RG|R\.G\.|identidade|carteira de identidade)\s*(?:n[º°o]\.?\s*)?[:\-]?\s*[\dXx][\dXx.\-/ ]{4,18}[\dXx](?:\s*[-–]?\s*(?:SSP|DETRAN|IFP|PC|SDS|SESP)[A-Z/]{0,5})?/gi;
const CEP = /\b(?:CEP\s*:?\s*)?\d{5}-\d{3}\b|\bCEP\s*:?\s*\d{8}\b/gi;
// (11) 91234-5678 · 11 91234 5678 · +55 11 3456-7890 · 11912345678
const PHONE = /(?:\+?55[\s.-]?)?(?:\(\s?\d{2}\s?\)|\b\d{2})[\s.-]?(?:9[\s.-]?)?\d{4}[\s.-]?\d{4}\b/g;
// Sequência solta de 10–11 dígitos (CPF ou telefone sem máscara).
const LONG_DIGITS = /\b\d{10,11}\b/g;

// Linha inteira de endereço.
const ADDRESS_LINE =
  /^.*(?:\b(?:endere[çc]o|resid[êe]ncia|bairro)\b|\bCEP\b|\b(?:rua|r\.|av\.|avenida|travessa|tv\.|alameda|al\.|rodovia|estrada|pra[çc]a|largo)\s+[^\n,]{2,60},?\s*(?:n[º°o]?\.?\s*)?\d{1,5}\b).*$/gim;
// Linha inteira com dado pessoal rotulado.
const PERSONAL_LABEL_LINE =
  /^\s*[-•*]?\s*(?:data de nascimento|nascimento|nascid[oa] em|idade|estado civil|sexo|g[êe]nero|nacionalidade|naturalidade)\b.*$/gim;
// Linha "Brasileira, casada, 32 anos" — estado civil em qualquer lugar da
// linha, ou "NN anos" junto de nacionalidade. "5 anos de experiência" fica.
const MARITAL = /\b(?:solteir[oa]|casad[oa]|divorciad[oa]|separad[oa]|vi[úu]v[oa]|uni[ãa]o est[áa]vel)\b/i;
const AGE_WITH_NATIONALITY = /\b\d{1,2}\s+anos\b(?!\s+de\s+experi)/i;
const NATIONALITY = /\bbrasileir[oa]\b|\bestrangeir[oa]\b/i;

const ACCENT_CLASSES: Record<string, string> = {
  a: "[aáàâãä]",
  e: "[eéèêë]",
  i: "[iíìîï]",
  o: "[oóòôõö]",
  u: "[uúùûü]",
  c: "[cç]",
  n: "[nñ]",
};

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// "João da Silva" casa com "JOAO DA SILVA", "Joao  da Silva" etc.
function flexibleNamePattern(name: string): string {
  const base = name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  return base
    .split(/\s+/)
    .filter(Boolean)
    .map((token) =>
      [...token].map((ch) => ACCENT_CLASSES[ch] ?? escapeRegex(ch)).join("")
    )
    .join("\\s+");
}

// Nome completo + "primeiro último" (forma comum no topo do currículo).
function namePatterns(fullName: string): RegExp[] {
  const tokens = fullName.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  const variants = new Set([tokens.join(" ")]);
  if (tokens.length > 2) variants.add(`${tokens[0]} ${tokens[tokens.length - 1]}`);
  return [...variants]
    .filter((v) => v.replace(/\s/g, "").length >= 3)
    .map((v) => new RegExp(`(?<![\\p{L}])${flexibleNamePattern(v)}(?![\\p{L}])`, "giu"));
}

export function redactResumeText(text: string, options: { candidateName?: string | null } = {}): string {
  let out = text;

  out = out.replace(EMAIL, "[E-MAIL]");
  out = out.replace(URL, "[LINK]");
  out = out.replace(SOCIAL_BARE, "[LINK]");
  out = out.replace(HANDLE, "$1[LINK]");

  out = out.replace(PERSONAL_LABEL_LINE, "[DADO PESSOAL]");
  out = out.replace(ADDRESS_LINE, "[ENDEREÇO]");
  out = out
    .split("\n")
    .map((line) =>
      MARITAL.test(line) || (AGE_WITH_NATIONALITY.test(line) && NATIONALITY.test(line)) ? "[DADO PESSOAL]" : line
    )
    .join("\n");

  out = out.replace(CEP, "[ENDEREÇO]");
  out = out.replace(CPF_FORMATTED, "[CPF]");
  out = out.replace(RG_LABELED, "[RG]");
  out = out.replace(PHONE, "[TELEFONE]");
  out = out.replace(LONG_DIGITS, "[NÚMERO]");

  if (options.candidateName) {
    for (const pattern of namePatterns(options.candidateName)) out = out.replace(pattern, "[NOME]");
  }

  // Linhas repetidas de marcador (ex.: bloco de endereço de 3 linhas) viram uma.
  return out.replace(/(\[(?:ENDEREÇO|DADO PESSOAL)\])(?:\s*\n\s*\1)+/g, "$1").replace(/\n{3,}/g, "\n\n").trim();
}

// Limite do texto enviado à IA (~3 mil tokens). Currículo típico tem 3–8 mil
// caracteres; o texto completo continua salvo no banco.
export const AI_INPUT_MAX_CHARS = 12_000;

export function truncateForAi(text: string, maxChars: number = AI_INPUT_MAX_CHARS): string {
  if (text.length <= maxChars) return text;
  const slice = text.slice(0, maxChars);
  // Corta num fim de parágrafo (ou de linha) se não perder muito texto.
  const paragraph = slice.lastIndexOf("\n\n");
  const line = slice.lastIndexOf("\n");
  const cut = paragraph >= maxChars * 0.7 ? paragraph : line >= maxChars * 0.7 ? line : maxChars;
  return `${slice.slice(0, cut).trimEnd()}\n[texto truncado]`;
}

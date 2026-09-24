import { extractText } from "unpdf";

// Extração de texto do PDF no servidor com `unpdf` (build do pdf.js pra
// serverless — sem worker, sem binário nativo). OCR fora do escopo: PDF
// digitalizado (só imagem) vira NO_TEXT e a IA não é chamada.

export type ExtractionResult =
  | { status: "OK"; text: string; pageCount: number }
  | { status: "NO_TEXT"; text: string; pageCount: number }
  | { status: "INVALID_PDF" };

// Texto guardado no banco (busca no Banco de talentos depois). Currículo
// real fica muito abaixo disso; o limite só protege contra PDF anômalo.
export const MAX_STORED_TEXT_CHARS = 100_000;

// "Sem texto legível": menos de 200 letras no total, ou menos de 50 por
// página em média (ex.: PDF digitalizado com só um cabeçalho em texto).
const MIN_LETTERS_TOTAL = 200;
const MIN_LETTERS_PER_PAGE = 50;

export function hasReadableText(text: string, pageCount: number): boolean {
  const letters = (text.match(/\p{L}/gu) ?? []).length;
  return letters >= MIN_LETTERS_TOTAL && letters / Math.max(1, pageCount) >= MIN_LETTERS_PER_PAGE;
}

export async function extractResumeText(data: Uint8Array): Promise<ExtractionResult> {
  let raw: string;
  let pageCount: number;
  try {
    // Cópia: o pdf.js pode "transferir" (esvaziar) o buffer recebido.
    const result = await extractText(new Uint8Array(data), { mergePages: true });
    raw = result.text;
    pageCount = result.totalPages;
  } catch {
    // Corrompido, protegido por senha, ou não é PDF.
    return { status: "INVALID_PDF" };
  }

  const text = raw
    .replace(/\u0000/g, "")
    .split("\n")
    .map((line) => line.replace(/[^\S\n]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_STORED_TEXT_CHARS);

  return hasReadableText(text, pageCount) ? { status: "OK", text, pageCount } : { status: "NO_TEXT", text, pageCount };
}

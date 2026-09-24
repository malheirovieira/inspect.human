import type { z } from "zod";

// Erros de validação por campo ({ email: "E-mail inválido" }) — a primeira
// mensagem de cada campo. Usado igual no cliente (antes de enviar) e na
// Server Action (resposta `fieldErrors`), pra mensagem aparecer embaixo do
// campo certo.
export type FieldErrors = Record<string, string>;

export function zodFieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

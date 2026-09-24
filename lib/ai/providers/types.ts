import { PermanentTaskError, TransientTaskError } from "@/lib/tasks/errors";

export type StructuredRequest = {
  system: string;
  input: string;
  schemaName: string;
  jsonSchema: object;
};

// Todo provedor devolve o TEXTO cru da resposta (JSON em string) — a
// validação é do chamador (lib/ai/screening.ts), igual pra todos.
export interface AiProvider {
  readonly name: "mock" | "gemini" | "openai";
  readonly model: string;
  readonly isMock: boolean;
  generate(req: StructuredRequest): Promise<string>;
}

export type FetchLike = typeof fetch;

// Tempo máximo de uma chamada — a rota do processador tem 60s no total.
export const PROVIDER_TIMEOUT_MS = 30_000;

// Retry-After em segundos ("30") ou data HTTP.
export function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(header);
  return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now());
}

// Resposta HTTP de erro → erro da fila. Mensagem só com provedor, status e
// código curto do provedor — nunca o corpo da requisição/resposta (evita
// qualquer eco de dado do currículo em background_tasks.last_error).
export function providerHttpError(
  provider: string,
  status: number,
  providerCode: string | undefined,
  retryAfterMs: number | undefined
): Error {
  const message = `${provider} HTTP ${status}${providerCode ? ` (${providerCode})` : ""}`;
  // Limite de uso / indisponível: temporário — volta pra fila sem consumir tentativa.
  if (status === 429 || status === 503) return new TransientTaskError(message, { retryAfterMs });
  // Requisição/chave/modelo inválidos: tentar de novo não resolve.
  if (status === 400 || status === 401 || status === 403 || status === 404) return new PermanentTaskError(message);
  return new Error(message);
}

// Lê o corpo de erro sem lançar (só pra extrair código curto / retry).
export async function readErrorBody(res: Response): Promise<Record<string, unknown> | null> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

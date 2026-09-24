import {
  PROVIDER_TIMEOUT_MS,
  parseRetryAfter,
  providerHttpError,
  readErrorBody,
  type AiProvider,
  type FetchLike,
  type StructuredRequest,
} from "./types";

// Google Gemini pela Interactions API (recomendada pelo Google desde
// jun/2026; o generateContent virou legado). Modelo da família Flash vem de
// AI_MODEL. `store: false` = o Google não guarda a interação.
// Doc: https://ai.google.dev/gemini-api/docs/interactions
//      https://ai.google.dev/gemini-api/docs/structured-output
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";

export function createGeminiProvider(opts: { apiKey: string; model: string; fetch?: FetchLike }): AiProvider {
  const doFetch = opts.fetch ?? fetch;
  return {
    name: "gemini",
    model: opts.model,
    isMock: false,
    async generate(req: StructuredRequest) {
      const res = await doFetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": opts.apiKey },
        body: JSON.stringify({
          model: opts.model,
          system_instruction: req.system,
          input: req.input,
          response_format: { type: "text", mime_type: "application/json", schema: req.jsonSchema },
          store: false,
        }),
        signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
      });

      if (!res.ok) {
        const body = await readErrorBody(res);
        const error = (body?.error ?? {}) as { status?: string; details?: { retryDelay?: string }[] };
        // RetryInfo do Google: { retryDelay: "12s" }
        const retryDelay = error.details?.find((d) => typeof d?.retryDelay === "string")?.retryDelay;
        const fromBody = retryDelay ? parseFloat(retryDelay) * 1000 : undefined;
        throw providerHttpError("Gemini", res.status, error.status, parseRetryAfter(res.headers.get("retry-after")) ?? fromBody);
      }

      return extractGeminiText(await res.json());
    },
  };
}

// Envelope REAL (confirmado em chamada de 2026-09-24, gemini-3.5-flash-lite):
//   { status: "completed", steps: [
//       { type: "thought", signature: "…" },                       ← ignorar
//       { type: "model_output", content: [{ type: "text", text: "{…}" }] } ] }
// A doc só mostra `output_text` (atalho dos SDKs) — mantido como fallback.
type GeminiStep = { type?: string; content?: { type?: string; text?: unknown }[] };

export function extractGeminiText(body: unknown): string {
  const b = body as { status?: unknown; steps?: unknown; output_text?: unknown };

  // Interação não concluída (ex.: bloqueada/incompleta) — falha comum, com o
  // status na mensagem em vez de um "sem texto" genérico.
  if (typeof b?.status === "string" && b.status !== "completed") {
    throw new Error(`Gemini: interação com status "${b.status}"`);
  }

  if (Array.isArray(b?.steps)) {
    const text = (b.steps as GeminiStep[])
      .filter((s) => s?.type === "model_output" && Array.isArray(s.content))
      .flatMap((s) => s.content!)
      .map((part) => (part?.type === "text" && typeof part.text === "string" ? part.text : ""))
      .join("");
    if (text) return text;
  }

  if (typeof b?.output_text === "string") return b.output_text;
  throw new Error("Gemini: resposta sem texto");
}

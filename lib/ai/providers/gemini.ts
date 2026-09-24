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

// A doc mostra o texto em `output_text`. Aceita também a lista `outputs`
// (itens com `text`) por segurança — o envelope completo da resposta não
// está documentado com exemplo REST.
export function extractGeminiText(body: unknown): string {
  const b = body as { output_text?: unknown; outputs?: unknown };
  if (typeof b?.output_text === "string") return b.output_text;
  if (Array.isArray(b?.outputs)) {
    const texts = b.outputs
      .map((o: { text?: unknown }) => (typeof o?.text === "string" ? o.text : null))
      .filter((t): t is string => t !== null);
    if (texts.length > 0) return texts.join("");
  }
  throw new Error("Gemini: resposta sem texto");
}

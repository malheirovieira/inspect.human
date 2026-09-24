import {
  PROVIDER_TIMEOUT_MS,
  parseRetryAfter,
  providerHttpError,
  readErrorBody,
  type AiProvider,
  type FetchLike,
  type StructuredRequest,
} from "./types";

// OpenAI pela Responses API com Structured Outputs (json_schema estrito).
// Modelo de baixo custo vem de AI_MODEL. `store: false` = a OpenAI não
// guarda a resposta pra consulta posterior.
// Doc: https://developers.openai.com/api/docs/guides/structured-outputs
const ENDPOINT = "https://api.openai.com/v1/responses";

export function createOpenAiProvider(opts: { apiKey: string; model: string; fetch?: FetchLike }): AiProvider {
  const doFetch = opts.fetch ?? fetch;
  return {
    name: "openai",
    model: opts.model,
    isMock: false,
    async generate(req: StructuredRequest) {
      const res = await doFetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${opts.apiKey}` },
        body: JSON.stringify({
          model: opts.model,
          instructions: req.system,
          input: req.input,
          text: { format: { type: "json_schema", name: req.schemaName, schema: req.jsonSchema, strict: true } },
          store: false,
        }),
        signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
      });

      if (!res.ok) {
        const body = await readErrorBody(res);
        const code = (body?.error as { code?: string; type?: string } | undefined)?.code ?? undefined;
        throw providerHttpError("OpenAI", res.status, code, parseRetryAfter(res.headers.get("retry-after")));
      }

      return extractOpenAiText(await res.json());
    },
  };
}

// output[] → itens "message" → content[] "output_text". Recusa ("refusal")
// volta como string vazia: cai na validação como resposta inválida.
export function extractOpenAiText(body: unknown): string {
  const output = (body as { output?: unknown })?.output;
  if (!Array.isArray(output)) throw new Error("OpenAI: resposta sem output");
  let text = "";
  for (const item of output as { type?: string; content?: { type?: string; text?: string }[] }[]) {
    if (item?.type !== "message" || !Array.isArray(item.content)) continue;
    for (const part of item.content) {
      if (part?.type === "output_text" && typeof part.text === "string") text += part.text;
    }
  }
  return text;
}

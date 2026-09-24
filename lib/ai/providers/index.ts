import type { AiConfig } from "../config";
import { createGeminiProvider } from "./gemini";
import { createMockProvider } from "./mock";
import { createOpenAiProvider } from "./openai";
import type { AiProvider, FetchLike } from "./types";

export type { AiProvider, StructuredRequest } from "./types";

// Único lugar que decide o provedor. Trocar de provedor = mudar env, nada
// mais. null quando a configuração tem erro (nenhuma chamada é feita).
export function createAiProvider(config: AiConfig, opts: { fetch?: FetchLike; mockDelayMs?: number } = {}): AiProvider | null {
  if (config.error) return null;
  switch (config.provider) {
    case "mock":
      return createMockProvider(opts.mockDelayMs);
    case "gemini":
      return createGeminiProvider({ apiKey: config.apiKey!, model: config.model, fetch: opts.fetch });
    case "openai":
      return createOpenAiProvider({ apiKey: config.apiKey!, model: config.model, fetch: opts.fetch });
  }
}

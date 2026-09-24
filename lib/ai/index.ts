import "server-only";
import { parseAiConfig, type AiConfig } from "./config";
import { createAiProvider } from "./providers";

// Ponto de entrada da camada de IA pro app — lê o env do SERVIDOR. Nada
// daqui pode ser importado por Client Component (server-only garante).
export function getAiConfig(): AiConfig {
  return parseAiConfig(process.env);
}

export function getAiProvider() {
  return createAiProvider(getAiConfig());
}

// Configuração da camada de IA, lida de variáveis de ambiente do SERVIDOR
// (nenhuma com prefixo NEXT_PUBLIC_ — a chave nunca chega ao navegador).
// Função pura (recebe o env) pra ser testável; o app usa getAiConfig() de
// lib/ai/index.ts.
//
//   AI_PROVIDER          mock | gemini | openai   (padrão: mock)
//   AI_MODEL             nome do modelo — obrigatório pra gemini/openai,
//                        nenhum nome fixo no código
//   GEMINI_API_KEY       chave do Gemini (AI_PROVIDER=gemini)
//   OPENAI_API_KEY       chave da OpenAI (AI_PROVIDER=openai)
//   AI_ALLOW_REAL_DATA   "true" libera candidatos reais; qualquer outro
//                        valor (ou ausente) = false. SÓ usar "true" com plano
//                        PAGO do provedor — os termos do plano gratuito do
//                        Gemini proíbem enviar dado pessoal.

export type AiProviderName = "mock" | "gemini" | "openai";

export type AiConfig = {
  provider: AiProviderName;
  model: string;
  apiKey: string | null;
  allowRealData: boolean;
  // Configuração incoerente (ex.: gemini sem chave). Com erro, nenhuma
  // chamada é feita — a análise falha com código CONFIG e Configurações
  // mostra a mensagem. Nunca contém a chave.
  error: string | null;
};

const PROVIDERS: AiProviderName[] = ["mock", "gemini", "openai"];

export function parseAiConfig(env: Record<string, string | undefined>): AiConfig {
  const allowRealData = env.AI_ALLOW_REAL_DATA?.trim().toLowerCase() === "true";
  const raw = env.AI_PROVIDER?.trim().toLowerCase() || "mock";
  const model = env.AI_MODEL?.trim() || "";

  if (!PROVIDERS.includes(raw as AiProviderName)) {
    // Não cai pra mock em silêncio: um erro de digitação não pode esconder
    // que a IA real não está rodando.
    return { provider: "mock", model: "mock", apiKey: null, allowRealData, error: `AI_PROVIDER inválido: "${raw}" (use mock, gemini ou openai).` };
  }
  const provider = raw as AiProviderName;

  if (provider === "mock") {
    return { provider, model: "mock", apiKey: null, allowRealData, error: null };
  }

  const keyVar = provider === "gemini" ? "GEMINI_API_KEY" : "OPENAI_API_KEY";
  const apiKey = env[keyVar]?.trim() || null;
  const missing = [!apiKey && keyVar, !model && "AI_MODEL"].filter(Boolean);
  return {
    provider,
    model,
    apiKey,
    allowRealData,
    error: missing.length > 0 ? `AI_PROVIDER=${provider} exige ${missing.join(" e ")}.` : null,
  };
}

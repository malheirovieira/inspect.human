import "server-only";
import { prisma } from "@/lib/prisma";
import { decryptApiKey, maskApiKey } from "@/lib/ai/credentials";

export type CompanyAiConfigView = {
  provider: "anthropic" | "openai" | "gemini";
  model: string;
  enabled: boolean;
  // Só os últimos 4 caracteres — a chave de verdade nunca sai do servidor
  // (decifrada aqui só pra montar a máscara, descartada em seguida).
  maskedKey: string;
};

// Única leitura usada pela tela de Parametrização — nunca devolve a chave
// completa nem o valor criptografado, só o indicador mascarado.
export async function getCompanyAiConfigMasked(companyId: string): Promise<CompanyAiConfigView | null> {
  const config = await prisma.companyAiConfig.findUnique({ where: { companyId } });
  if (!config) return null;

  let maskedKey = "•••• ????";
  try {
    maskedKey = maskApiKey(decryptApiKey(config.apiKeyEncrypted));
  } catch {
    // Credencial corrompida — mostra um indicador genérico em vez de quebrar a tela.
  }

  return {
    provider: config.provider as CompanyAiConfigView["provider"],
    model: config.model,
    enabled: config.enabled,
    maskedKey,
  };
}

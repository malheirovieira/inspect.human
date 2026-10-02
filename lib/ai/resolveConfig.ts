import "server-only";
import { prisma } from "@/lib/prisma";
import { getAiConfig } from "./index";
import { decryptApiKey } from "./credentials";
import type { AiConfig, AiProviderName } from "./config";

const PROVIDER_NAMES: AiProviderName[] = ["mock", "gemini", "openai", "anthropic"];

// Resolução de config de IA por empresa (BYOK, Fase 1) — fonte única de
// verdade usada por toda a triagem/análise. Empresa com CompanyAiConfig
// ativo e com chave configurada usa a PRÓPRIA conta; sem isso (ou se a
// credencial não puder ser decifrada — ex. a chave de criptografia da
// plataforma mudou), cai na config da plataforma (process.env), que é o
// comportamento de hoje. `allowRealData` continua sendo o interruptor
// global de segurança da plataforma — BYOK não dá bypass nele, é só troca
// de QUEM fornece a chave.
export async function resolveCompanyAiConfig(companyId: string): Promise<AiConfig> {
  const platformConfig = getAiConfig();

  const companyConfig = await prisma.companyAiConfig.findUnique({ where: { companyId } });
  if (!companyConfig || !companyConfig.enabled) return platformConfig;

  if (!PROVIDER_NAMES.includes(companyConfig.provider as AiProviderName)) return platformConfig;

  try {
    const apiKey = decryptApiKey(companyConfig.apiKeyEncrypted);
    return {
      provider: companyConfig.provider as AiProviderName,
      model: companyConfig.model,
      apiKey,
      allowRealData: platformConfig.allowRealData,
      error: null,
    };
  } catch (err) {
    // Credencial corrompida ou chave de criptografia da plataforma trocada —
    // nunca derruba a triagem por isso, só avisa no log e cai no fallback.
    console.error(`[resolveCompanyAiConfig] falha ao decifrar credencial da empresa ${companyId}:`, err);
    return platformConfig;
  }
}

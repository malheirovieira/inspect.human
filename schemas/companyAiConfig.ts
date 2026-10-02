import { z } from "zod";

export const AI_PROVIDERS = ["anthropic", "openai", "gemini"] as const;

export const AI_PROVIDER_LABELS: Record<(typeof AI_PROVIDERS)[number], string> = {
  anthropic: "Anthropic (Claude)",
  openai: "OpenAI",
  gemini: "Google Gemini",
};

// apiKey vazio = "manter a chave já salva" (campo é write-only: nunca
// preenchido de volta com o valor real). Só exige chave não-vazia quando
// NÃO existe nenhuma config prévia pra essa empresa (ver action).
export const companyAiConfigSchema = z.object({
  provider: z.enum(AI_PROVIDERS),
  apiKey: z.string().trim().optional(),
  model: z.string().trim().min(1, "Informe o modelo"),
  enabled: z.boolean(),
});

export type CompanyAiConfigInput = z.infer<typeof companyAiConfigSchema>;

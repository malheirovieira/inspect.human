// Regra ÚNICA de quando a triagem com IA pode rodar pra um currículo.
// Chamada ao enfileirar E de novo dentro do processamento (a configuração
// pode mudar enquanto a tarefa espera na fila).
//
// O motivo é sempre sobre a FERRAMENTA, nunca sobre o candidato — e recusar
// a IA não pode prejudicar o candidato em nada.

export type AiBlockReason = "REAL_DATA_BLOCKED" | "COMPANY_DISABLED" | "NO_CONSENT";

export function getAiBlockReason(input: {
  isTest: boolean;
  allowRealData: boolean;
  companyEnabled: boolean;
  hasAiConsent: boolean;
}): AiBlockReason | null {
  // Candidato de teste (fictício) é dispensado da chave da empresa e do
  // consentimento — é o que permite testar com AI_ALLOW_REAL_DATA=false.
  if (input.isTest) return null;
  if (!input.allowRealData) return "REAL_DATA_BLOCKED";
  if (!input.companyEnabled) return "COMPANY_DISABLED";
  if (!input.hasAiConsent) return "NO_CONSENT";
  return null;
}

// Textos da interface (aprovados). Nunca usar "elegível"/"inelegível" — o
// recrutador não pode ler isso como "o candidato não serve pra vaga".
export const AI_BLOCK_REASON_LABELS: Record<AiBlockReason, string> = {
  NO_CONSENT: "Análise por IA não autorizada pelo candidato",
  COMPANY_DISABLED: "Triagem com IA desativada",
  REAL_DATA_BLOCKED: "Triagem com IA indisponível",
};

// Finalidade de consentimento exigida (tabela consents).
export const AI_SCREENING_CONSENT_PURPOSE = "AI_SCREENING";

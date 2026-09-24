import type { AiProvider, StructuredRequest } from "./types";

// Modo "mock": NÃO chama API nenhuma. Depois de um pequeno atraso devolve um
// exemplo fictício no MESMO formato do real (passa pela mesma validação). É
// o padrão sem AI_PROVIDER — desenvolvimento e demonstrações. A interface
// mostra "Exemplo simulado · sem IA" pra resultado de mock.
export const MOCK_RESULT = {
  resumo:
    "Profissional de análise de dados com atuação em varejo e serviços financeiros. Conduziu projetos de automação de relatórios e modelagem de indicadores comerciais. Atua com times de negócio na definição de métricas.",
  experienciaAnos: 6,
  experienciaBase: "Soma dos períodos de 2018 a 2024 informados no currículo.",
  competencias: ["SQL", "Python", "Power BI", "Modelagem de dados", "ETL", "Excel avançado"],
  ultimosCargos: [
    { cargo: "Analista de Dados Pleno", empresa: "Empresa Exemplo Ltda." },
    { cargo: "Analista de BI Júnior", empresa: "Comércio Fictício S.A." },
  ],
  formacao: "Bacharelado em Estatística",
};

export function createMockProvider(delayMs = 1500): AiProvider {
  return {
    name: "mock",
    model: "mock",
    isMock: true,
    async generate(_req: StructuredRequest) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return JSON.stringify(MOCK_RESULT);
    },
  };
}

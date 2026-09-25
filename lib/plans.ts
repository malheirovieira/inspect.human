// Planos do Inspect Talent — fonte ÚNICA (página Planos, botão Upgrade,
// card "Seu plano" da Início, limite mensal da triagem com IA).
//
// ⚠ PLACEHOLDER: nomes, preços, descrições, itens e limites são PROVISÓRIOS
// — a definição final é do negócio. Ainda NÃO existe cobrança: a troca de
// plano não é implementada (o botão "Assinar" só mostra um aviso).
//
// Ordem da lista = do mais básico ao mais alto. O primeiro é o padrão de
// toda empresa (Company.plan); o último é o "mais alto" (esconde o Upgrade).

export type PlanId = "essencial" | "profissional" | "empresarial";

export type Plan = {
  id: PlanId;
  name: string;
  // Preço mensal em reais (inteiro). PLACEHOLDER.
  monthlyPrice: number;
  description: string;
  features: string[];
  // Limite mensal de currículos analisados pela triagem com IA. PLACEHOLDER.
  aiResumeLimit: number;
};

export const PLANS: readonly Plan[] = [
  {
    id: "essencial",
    name: "Essencial", // PLACEHOLDER
    monthlyPrice: 99, // PLACEHOLDER
    description: "Para começar a organizar o recrutamento.", // PLACEHOLDER
    features: [
      // PLACEHOLDER
      "Vagas e página pública de candidatura",
      "Kanban de candidatos",
      "Banco de talentos",
      "50 currículos analisados por IA por mês",
    ],
    aiResumeLimit: 50, // PLACEHOLDER
  },
  {
    id: "profissional",
    name: "Profissional", // PLACEHOLDER
    monthlyPrice: 199, // PLACEHOLDER
    description: "Para quem contrata todo mês.", // PLACEHOLDER
    features: [
      // PLACEHOLDER
      "Tudo do Essencial",
      "Filtro por competência no banco de talentos",
      "Tarefas em segundo plano com histórico",
      "200 currículos analisados por IA por mês",
    ],
    aiResumeLimit: 200, // PLACEHOLDER
  },
  {
    id: "empresarial",
    name: "Empresarial", // PLACEHOLDER
    monthlyPrice: 399, // PLACEHOLDER
    description: "Para equipes de RH com alto volume.", // PLACEHOLDER
    features: [
      // PLACEHOLDER
      "Tudo do Profissional",
      "Vários recrutadores na mesma empresa",
      "Suporte prioritário",
      "1.000 currículos analisados por IA por mês",
    ],
    aiResumeLimit: 1000, // PLACEHOLDER
  },
];

export const DEFAULT_PLAN_ID: PlanId = PLANS[0].id;
export const TOP_PLAN_ID: PlanId = PLANS[PLANS.length - 1].id;

// Contato provisório do aviso "Em breve: fale com a gente…". PLACEHOLDER.
export const PLAN_CONTACT_URL = "mailto:contato@inspecttalent.com.br?subject=Mudar%20de%20plano";

// Valor salvo no banco que não existe mais na lista cai no plano básico
// (nunca quebra a tela por causa de um plano renomeado).
export function getPlan(id: string | null | undefined): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

export function isTopPlan(id: string | null | undefined): boolean {
  return getPlan(id).id === TOP_PLAN_ID;
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function formatPlanPrice(plan: Plan): string {
  return brl.format(plan.monthlyPrice);
}

// Planos do Inspect Talent — fonte ÚNICA (página Planos, botão Upgrade,
// card "Seu plano" da Início, limite mensal da triagem com IA).
//
// ⚠ PLACEHOLDER: nomes, preços, descrições, itens e limites são PROVISÓRIOS
// — a definição final é do negócio. Ainda NÃO existe cobrança: a troca de
// plano não é implementada (o botão "Assinar" só mostra um aviso, exceto o
// Corporativo, que é "sob consulta" e linka direto pro contato comercial).
//
// Ordem da lista = do mais básico ao mais alto. O primeiro é o padrão de
// toda empresa (Company.plan); o último é o "mais alto" (esconde o Upgrade).

export type PlanId = "essencial" | "profissional" | "corporativo";

export type PlanFeature = {
  label: string;
  included: boolean;
  // Nome do plano que desbloqueia — só faz sentido quando !included.
  blockedBy?: string;
};

export type Plan = {
  id: PlanId;
  name: string;
  tagline: string;
  badge: string | null;
  // "highlight" = badge escuro (ex.: "Mais Popular"); "neutral" = badge
  // cinza (ex.: "7 dias grátis").
  badgeVariant: "highlight" | "neutral" | null;
  // Preço mensal em reais, só pra referência/cálculos futuros — null quando
  // não há preço fixo (Corporativo, sob consulta). A exibição usa sempre os
  // campos de texto abaixo (já formatados), não este número.
  monthlyPrice: number | null;
  priceLabel: string; // "Grátis" | "R$ 99,90" | "Sob consulta"
  priceSuffix: string; // "por 7 dias" | "/mês" | ""
  priceAfter: string | null; // linha menor abaixo do preço, ou null
  usersLabel: string; // "1 usuário" | "Até 3 usuários" | "Usuários ilimitados"
  highlight: boolean; // card em destaque (Profissional)
  buttonLabel: string;
  // Presente = link direto (mailto/externo), sem o dialog "Em breve" —
  // usado pelo Corporativo (fala com o comercial, não assina sozinho).
  buttonHref?: string;
  features: PlanFeature[];
  // Limite mensal de currículos analisados pela triagem com IA. PLACEHOLDER.
  // Infinity = ilimitado.
  aiResumeLimit: number;
};

export const PLANS: readonly Plan[] = [
  {
    id: "essencial",
    name: "Essencial",
    tagline: "Para começar a contratar sem custo",
    badge: "7 dias grátis",
    badgeVariant: "neutral",
    monthlyPrice: 59.9,
    priceLabel: "Grátis",
    priceSuffix: "por 7 dias",
    priceAfter: "Depois R$ 59,90/mês",
    usersLabel: "1 usuário",
    highlight: false,
    buttonLabel: "Começar grátis",
    features: [
      { label: "Vagas e página de candidatura", included: true },
      { label: "Kanban de candidatos", included: true },
      { label: "Banco de talentos", included: true },
      { label: "Agendamento de entrevistas", included: true },
      { label: "Análise de IA", included: false, blockedBy: "Profissional" },
      { label: "E-mail automático", included: false, blockedBy: "Profissional" },
      { label: "Avaliação DISC", included: false, blockedBy: "Profissional" },
      { label: "Suporte prioritário", included: false, blockedBy: "Corporativo" },
    ],
    aiResumeLimit: 0,
  },
  {
    id: "profissional",
    name: "Profissional",
    tagline: "Para contratar com inteligência e automação",
    badge: "Mais Popular",
    badgeVariant: "highlight",
    monthlyPrice: 99.9,
    priceLabel: "R$ 99,90",
    priceSuffix: "/mês",
    priceAfter: null,
    usersLabel: "Até 3 usuários",
    highlight: true,
    buttonLabel: "Assinar agora",
    features: [
      { label: "Vagas e página de candidatura", included: true },
      { label: "Kanban de candidatos", included: true },
      { label: "Banco de talentos", included: true },
      { label: "Agendamento de entrevistas", included: true },
      { label: "Análise de IA — 30/mês", included: true },
      { label: "E-mail automático — 100/mês", included: true },
      { label: "Avaliação DISC — 20/mês", included: true },
      { label: "Suporte prioritário", included: false, blockedBy: "Corporativo" },
    ],
    aiResumeLimit: 30,
  },
  {
    id: "corporativo",
    name: "Corporativo",
    tagline: "Para equipes de RH sem limites",
    badge: null,
    badgeVariant: null,
    monthlyPrice: null,
    priceLabel: "Sob consulta",
    priceSuffix: "",
    priceAfter: "Preço personalizado para o seu volume",
    usersLabel: "Usuários ilimitados",
    highlight: false,
    buttonLabel: "Falar com o comercial",
    buttonHref: "mailto:comercial@inspecttalent.com.br?subject=Interesse%20no%20plano%20Corporativo",
    features: [
      { label: "Vagas e página de candidatura", included: true },
      { label: "Kanban de candidatos", included: true },
      { label: "Banco de talentos", included: true },
      { label: "Agendamento de entrevistas", included: true },
      { label: "Análise de IA — Ilimitado", included: true },
      { label: "E-mail automático — Ilimitado", included: true },
      { label: "Avaliação DISC — Ilimitado", included: true },
      { label: "Suporte prioritário", included: true },
    ],
    aiResumeLimit: Infinity,
  },
];

export const DEFAULT_PLAN_ID: PlanId = PLANS[0].id;
export const TOP_PLAN_ID: PlanId = PLANS[PLANS.length - 1].id;

// Contato provisório do aviso "Em breve: fale com a gente…" (Essencial e
// Profissional — o Corporativo já linka direto via Plan.buttonHref). PLACEHOLDER.
export const PLAN_CONTACT_URL = "mailto:contato@inspecttalent.com.br?subject=Mudar%20de%20plano";

// Valor salvo no banco que não existe mais na lista cai no plano básico
// (nunca quebra a tela por causa de um plano renomeado).
export function getPlan(id: string | null | undefined): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

export function isTopPlan(id: string | null | undefined): boolean {
  return getPlan(id).id === TOP_PLAN_ID;
}

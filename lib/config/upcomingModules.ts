import { Clock, UserPlus, Users, MessageSquare, type LucideIcon } from "lucide-react";

export type UpcomingSubModule = {
  label: string;
  description: string;
  // Presente = link de verdade (ex.: Avaliações, injetado em Sidebar.tsx
  // dentro de "Gestão de pessoas"). Ausente = módulo do roadmap, sem
  // página — clicar mostra o toast "Em desenvolvimento", sem navegar.
  href?: string;
};

export type UpcomingModule = {
  label: string;
  description: string;
  icon: LucideIcon;
  // Módulos relacionados agrupados dentro do pai (ex.: Férias/Desempenho/
  // Metas/Clima & eNPS dentro de Gestão de pessoas) — reduz a quantidade de
  // itens soltos na sidebar. Com subModules, o item vira um acordeão
  // (abre/fecha de verdade) mesmo sendo, ele próprio, só uma prévia do
  // roadmap — só as folhas sem "href" é que não levam a lugar nenhum.
  subModules?: UpcomingSubModule[];
};

// Prévia do roadmap na sidebar — sem rota, sem backend, só interface.
// Adicionar módulo novo aqui é o único passo necessário (ver
// components/layout/Sidebar.tsx). "DISC — Perfil comportamental ilimitado"
// do roadmap NÃO entra aqui: é o mesmo DISC que já existe em Avaliações, só
// citado de novo como material de marketing. "Recrutamento & Seleção"
// também não entra: já é o módulo ativo hoje.
export const UPCOMING_MODULES: UpcomingModule[] = [
  { label: "Ponto Eletrônico", description: "App, GPS e banco de horas", icon: Clock },
  { label: "Admissão", description: "Onboarding digital sem papel", icon: UserPlus },
  {
    label: "Gestão de pessoas",
    description: "Cadastros e dados dos colaboradores",
    icon: Users,
    // O primeiro item real (Avaliações) é injetado em Sidebar.tsx — aqui só
    // ficam os módulos do roadmap que ainda não existem de verdade.
    subModules: [
      { label: "Férias", description: "Saldo, solicitação e aprovação" },
      { label: "Desempenho", description: "Avaliações 90°/180°/360°, 9 Box e PDI" },
      { label: "Metas", description: "Objetivos individuais e de equipe" },
      { label: "Clima & eNPS", description: "Pesquisas e engajamento" },
    ],
  },
  {
    label: "Comunicação",
    description: "Feed, celebrações e guia",
    icon: MessageSquare,
    subModules: [{ label: "Ouvidoria", description: "Canal de escuta e denúncias" }],
  },
];

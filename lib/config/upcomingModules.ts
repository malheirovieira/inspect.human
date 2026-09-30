import {
  Clock,
  UserPlus,
  Palmtree,
  TrendingUp,
  Target,
  Smile,
  Users,
  MessageSquare,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";

export type UpcomingModule = {
  label: string;
  description: string;
  icon: LucideIcon;
};

// Prévia do roadmap na sidebar (seção "EM BREVE") — sem rota, sem backend,
// só interface. Adicionar módulo novo aqui é o único passo necessário (ver
// components/layout/Sidebar.tsx, seção EM BREVE). "DISC — Perfil
// comportamental ilimitado" do roadmap NÃO entra aqui: é o mesmo DISC que já
// existe em Avaliações, só citado de novo como material de marketing.
// "Recrutamento & Seleção" também não entra: já é o módulo ativo hoje.
export const UPCOMING_MODULES: UpcomingModule[] = [
  { label: "Ponto Eletrônico", description: "App, GPS e banco de horas", icon: Clock },
  { label: "Admissão", description: "Onboarding digital sem papel", icon: UserPlus },
  { label: "Férias", description: "Saldo, solicitação e aprovação", icon: Palmtree },
  { label: "Desempenho", description: "Avaliações 90°/180°/360°, 9 Box e PDI", icon: TrendingUp },
  { label: "Metas", description: "Objetivos individuais e de equipe", icon: Target },
  { label: "Clima & eNPS", description: "Pesquisas e engajamento", icon: Smile },
  { label: "Gestão de pessoas", description: "Cadastros e dados dos colaboradores", icon: Users },
  { label: "Comunicação", description: "Feed, celebrações e guia", icon: MessageSquare },
  { label: "Ouvidoria", description: "Canal de escuta e denúncias", icon: ShieldAlert },
];

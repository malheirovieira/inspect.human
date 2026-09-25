import { Header } from "@/components/layout/Header";

function formatHeaderDate(date: Date): string {
  const dayMonth = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long" }).format(date);
  return `${dayMonth}, ${date.getFullYear()}`;
}

// Pouso fixo pós-login (sempre aqui, nunca no último módulo visitado — ver
// Sidebar.tsx: fica fora de GROUPS, por isso nenhuma seção do menu acende
// quando o usuário está nesta página). Só o título por ora — o fundo
// ambiente vem do layout (components/layout/AmbientBackground). O que entra
// aqui é decisão futura, não dado inventado.
export default function InicioPage() {
  return <Header title="Início" date={formatHeaderDate(new Date())} />;
}

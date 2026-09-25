import { Header } from "@/components/layout/Header";
import { TestimonialsStrip } from "@/components/inicio/TestimonialsStrip";
import { requireSession } from "@/lib/session";
import { TESTIMONIALS } from "@/lib/testimonials";

function formatHeaderDate(date: Date): string {
  const dayMonth = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long" }).format(date);
  return `${dayMonth}, ${date.getFullYear()}`;
}

// Pouso fixo pós-login (sempre aqui, nunca no último módulo visitado — ver
// Sidebar.tsx: fica fora de GROUPS, por isso nenhuma seção do menu acende
// quando o usuário está nesta página). O fundo ambiente vem do layout
// (components/layout/AmbientBackground).
//
// Título = saudação neutra (serve pra qualquer gênero) com o primeiro nome;
// o item do menu ("Início"), a aba do navegador e o rótulo acima do título
// continuam iguais. Abaixo, a faixa de depoimentos FICTÍCIOS
// (lib/testimonials.ts) — só ADMIN e HR; EMPLOYEE vê só o título.
//
// "Precisa da sua atenção" saiu da tela, mas a lógica continua pronta pra
// uso futuro em outro lugar: services/attention.ts + AttentionCard.
export default async function InicioPage() {
  const session = await requireSession();
  const firstName = session.name.trim().split(/\s+/)[0] ?? "";
  const header = (
    <Header
      title={firstName ? `Que bom ter você de volta, ${firstName}` : "Que bom ter você de volta"}
      date={formatHeaderDate(new Date())}
    />
  );
  if (session.role !== "ADMIN" && session.role !== "HR") return header;

  return (
    <>
      {header}
      <div className="fin-content">
        <TestimonialsStrip items={[...TESTIMONIALS]} />
      </div>
    </>
  );
}

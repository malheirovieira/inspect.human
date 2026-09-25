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
// Ordem: título → faixa "O que dizem sobre o Inspect Talent" (depoimentos
// FICTÍCIOS de lib/testimonials.ts). Só ADMIN e HR veem a faixa (EMPLOYEE vê
// só o título). O card "Seu plano" saiu da Início em 2026-09-25.
//
// "Precisa da sua atenção" saiu da tela, mas a lógica continua pronta pra
// uso futuro em outro lugar: services/attention.ts + AttentionCard.
export default async function InicioPage() {
  const session = await requireSession();
  const header = <Header title="Início" date={formatHeaderDate(new Date())} />;
  if (session.role !== "ADMIN" && session.role !== "HR") return header;

  return (
    <>
      {header}
      <div className="fin-content">
        <section aria-labelledby="depoimentos-titulo" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 id="depoimentos-titulo" className="fin-heading" style={{ margin: 0 }}>
            O que dizem sobre o Inspect Talent
          </h2>
          <TestimonialsStrip items={[...TESTIMONIALS]} />
        </section>
      </div>
    </>
  );
}

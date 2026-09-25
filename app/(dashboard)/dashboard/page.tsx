import { Header } from "@/components/layout/Header";
import { PlanSummaryCard } from "@/components/inicio/PlanSummaryCard";
import { TestimonialsStrip } from "@/components/inicio/TestimonialsStrip";
import { CornerDock } from "@/components/inicio/CornerDock";
import { requireSession } from "@/lib/session";
import { TESTIMONIALS } from "@/lib/testimonials";
import { getCompanyPlan } from "@/services/plans";
import { getMonthlyAiUsage } from "@/services/resumeAnalyses";

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
// FICTÍCIOS de lib/testimonials.ts) → card "Seu plano" FIXO no canto
// inferior direito (CornerDock; no celular fica no fim da página). Só ADMIN
// e HR veem as seções (EMPLOYEE vê só o título); "Ver planos" só pra ADMIN.
//
// "Precisa da sua atenção" saiu da tela, mas a lógica continua pronta pra
// uso futuro em outro lugar: services/attention.ts + AttentionCard.
export default async function InicioPage() {
  const session = await requireSession();
  const header = <Header title="Início" date={formatHeaderDate(new Date())} />;
  if (session.role !== "ADMIN" && session.role !== "HR") return header;

  const [plan, used] = await Promise.all([getCompanyPlan(session.companyId), getMonthlyAiUsage(session.companyId)]);
  const showPlansLink = session.role === "ADMIN";

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

        {/* Espaço reservado no desktop: o card fixo do canto não cobre o fim
            da página (altura do card + 24px de margem + folga). */}
        <div className="fin-corner-spacer" style={{ height: showPlansLink ? 320 : 250 }} aria-hidden="true" />

        <CornerDock>
          <PlanSummaryCard plan={plan} used={used} showPlansLink={showPlansLink} />
        </CornerDock>
      </div>
    </>
  );
}

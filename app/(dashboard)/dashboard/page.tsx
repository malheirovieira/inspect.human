import { CheckCircle2 } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { PlanSummaryCard } from "@/components/inicio/PlanSummaryCard";
import { AttentionCard } from "@/components/inicio/AttentionCard";
import { requireSession } from "@/lib/session";
import { getCompanyPlan } from "@/services/plans";
import { getMonthlyAiUsage } from "@/services/resumeAnalyses";
import { getAttentionItems } from "@/services/attention";

function formatHeaderDate(date: Date): string {
  const dayMonth = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long" }).format(date);
  return `${dayMonth}, ${date.getFullYear()}`;
}

// Pouso fixo pós-login (sempre aqui, nunca no último módulo visitado — ver
// Sidebar.tsx: fica fora de GROUPS, por isso nenhuma seção do menu acende
// quando o usuário está nesta página). O fundo ambiente vem do layout
// (components/layout/AmbientBackground).
//
// Ordem: título → "Seu plano" → "Precisa da sua atenção". As duas seções
// são de recrutamento/empresa: só ADMIN e HR veem (EMPLOYEE vê só o
// título). "Ver planos" só pra ADMIN.
export default async function InicioPage() {
  const session = await requireSession();
  const header = <Header title="Início" date={formatHeaderDate(new Date())} />;
  if (session.role !== "ADMIN" && session.role !== "HR") return header;

  const [plan, used, attention] = await Promise.all([
    getCompanyPlan(session.companyId),
    getMonthlyAiUsage(session.companyId),
    getAttentionItems(session.companyId),
  ]);

  return (
    <>
      {header}
      <div className="fin-content">
        <PlanSummaryCard plan={plan} used={used} showPlansLink={session.role === "ADMIN"} />

        <section aria-labelledby="atencao-titulo" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 id="atencao-titulo" className="fin-heading" style={{ margin: 0 }}>
            Precisa da sua atenção
          </h2>
          {attention.length === 0 ? (
            <p className="fin-attention-empty">
              <CheckCircle2 size={16} aria-hidden="true" /> Tudo em dia
            </p>
          ) : (
            <div className="fin-attention-grid">
              {attention.map((item) => (
                <AttentionCard key={`${item.type}-${item.jobId}`} item={item} />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

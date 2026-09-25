import { Header } from "@/components/layout/Header";
import { PlanCard } from "@/components/configuracoes/PlanCard";
import { PLANS } from "@/lib/plans";
import { requireRole } from "@/lib/session";
import { getCompanyPlan } from "@/services/plans";

// Planos (só ADMIN) — um card por plano de lib/plans.ts (valores
// PLACEHOLDER). Ainda sem cobrança: "Assinar" só abre o aviso "Em breve".
export default async function PlanosPage() {
  const session = await requireRole(["ADMIN"]);
  const current = await getCompanyPlan(session.companyId);

  return (
    <>
      <Header
        title="Planos"
        backHref="/configuracoes"
        breadcrumb={[{ label: "Configurações", href: "/configuracoes" }, { label: "Planos" }]}
      />
      <div className="fin-content">
        <div className="fin-plans-grid">
          {PLANS.map((plan) => (
            <PlanCard key={plan.id} plan={plan} current={plan.id === current.id} />
          ))}
        </div>
      </div>
    </>
  );
}

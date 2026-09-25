import Link from "next/link";
import { formatPlanPrice, type Plan } from "@/lib/plans";

// Card "Seu plano" da Início — mesmo estilo do card de preço da página
// Planos (components/configuracoes/PlanCard), mais compacto.
// Referência visual: Uiverse.io (licença MIT) — adaptado ao design system.
// CSS em globals.css (.fin-plan-summary).
export function PlanSummaryCard({ plan, used, showPlansLink }: { plan: Plan; used: number; showPlansLink: boolean }) {
  const pct = Math.min(100, Math.round((used / Math.max(1, plan.aiResumeLimit)) * 100));

  return (
    <section className="fin-plan-summary" aria-label="Seu plano">
      <div className="fin-plan-summary__plan">
        <span className="fin-eyebrow">SEU PLANO</span>
        <div className="fin-plan-summary__name">{plan.name}</div>
        <p className="fin-plan-summary__price">
          <span className="fin-plan-summary__amount">{formatPlanPrice(plan)}</span>
          <span className="fin-plan-card__period"> /mês</span>
        </p>
      </div>
      <div className="fin-plan-summary__usage">
        <div className="fin-plan-summary__usage-text">
          <strong>{used.toLocaleString("pt-BR")}</strong> de {plan.aiResumeLimit.toLocaleString("pt-BR")} currículos
          analisados por IA
        </div>
        <div className="fin-bar__track" role="progressbar" aria-valuemin={0} aria-valuemax={plan.aiResumeLimit} aria-valuenow={used}>
          <div className="fin-bar__fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="fin-plan-summary__hint">Uso deste mês</span>
      </div>
      {showPlansLink && (
        <Link href="/configuracoes/planos" className="fin-plan-summary__link">
          Ver planos
        </Link>
      )}
    </section>
  );
}

import { Check } from "lucide-react";
import { formatPlanPrice, type Plan } from "@/lib/plans";
import { SubscribeButton } from "./SubscribeButton";

// Card de preço de um plano (página Planos).
// Referência visual: Uiverse.io (licença MIT) — adaptado ao design system
// (raio --radius-lg, borda/sombra do sistema, botão pílula verde de
// confirmação). CSS em globals.css (.fin-plan-card).
export function PlanCard({ plan, current }: { plan: Plan; current: boolean }) {
  return (
    <div className={`fin-plan-card${current ? " fin-plan-card--current" : ""}`}>
      <div className="fin-plan-card__top">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <h2 className="fin-plan-card__name">{plan.name}</h2>
            {current && <span className="fin-plan-card__current-tag">Plano atual</span>}
          </div>
          <p className="fin-plan-card__description">{plan.description}</p>
        </div>
        <p className="fin-plan-card__price">
          <span className="fin-plan-card__amount">{formatPlanPrice(plan)}</span>
          <span className="fin-plan-card__period"> /mês</span>
        </p>
        <ul className="fin-plan-card__features">
          {plan.features.map((feature) => (
            <li key={feature}>
              <Check size={15} aria-hidden="true" />
              {feature}
            </li>
          ))}
        </ul>
      </div>
      <div className="fin-plan-card__bottom">
        {current ? (
          <button type="button" className="fin-plan-card__cta" disabled>
            Seu plano atual
          </button>
        ) : (
          <SubscribeButton planName={plan.name} />
        )}
      </div>
    </div>
  );
}

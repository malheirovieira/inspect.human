import { Check, Lock, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Plan } from "@/lib/plans";
import { SubscribeButton } from "./SubscribeButton";

// Card de preço de um plano (página Planos). Visual próprio desta página
// (preto/cinza no destaque, sem o verde de confirmação do resto do sistema
// — pedido explícito, ver commit) em vez do --action-confirm verde padrão.
// CSS em globals.css (.fin-plan-card).
export function PlanCard({ plan, current }: { plan: Plan; current: boolean }) {
  return (
    <div
      className={cn(
        "fin-plan-card",
        plan.highlight && "fin-plan-card--highlight",
        current && "fin-plan-card--current"
      )}
    >
      {plan.badge && (
        <span className={cn("fin-plan-card__badge", plan.badgeVariant === "highlight" && "fin-plan-card__badge--highlight")}>
          {plan.badge}
        </span>
      )}

      <div className="fin-plan-card__top">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <h2 className="fin-plan-card__name">{plan.name}</h2>
            {current && <span className="fin-plan-card__current-tag">Plano atual</span>}
          </div>
          <p className="fin-plan-card__description">{plan.tagline}</p>
        </div>

        <div className="fin-plan-card__price">
          <span className="fin-plan-card__amount">{plan.priceLabel}</span>
          {plan.priceSuffix && <span className="fin-plan-card__period"> {plan.priceSuffix}</span>}
          {plan.priceAfter && <p className="fin-plan-card__price-after">{plan.priceAfter}</p>}
        </div>

        <ul className="fin-plan-card__features">
          <li>
            <Users size={15} aria-hidden="true" />
            {plan.usersLabel}
          </li>
          {plan.features.map((feature) => (
            <li
              key={feature.label}
              className={!feature.included ? "fin-plan-card__feature--blocked" : undefined}
              title={!feature.included ? `Disponível a partir do plano ${feature.blockedBy}` : undefined}
            >
              {feature.included ? <Check size={15} aria-hidden="true" /> : <Lock size={15} aria-hidden="true" />}
              {feature.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="fin-plan-card__bottom">
        {current ? (
          <button type="button" className="fin-plan-card__cta" disabled>
            Seu plano atual
          </button>
        ) : plan.buttonHref ? (
          <a href={plan.buttonHref} className="fin-plan-card__cta fin-plan-card__cta--outline" style={{ textDecoration: "none" }}>
            {plan.buttonLabel}
          </a>
        ) : (
          <SubscribeButton planName={plan.name} label={plan.buttonLabel} outline={!plan.highlight} />
        )}
      </div>
    </div>
  );
}

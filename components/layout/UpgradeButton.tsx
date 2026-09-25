import Link from "next/link";
import { ArrowUp } from "lucide-react";
import { getSession } from "@/lib/session";
import { isTopPlan } from "@/lib/plans";
import { getCompanyPlan } from "@/services/plans";

// Botão "Upgrade" da barra superior, à esquerda do sino.
// Referência visual: Uiverse.io (licença MIT) — adaptado ao design system
// (altura de 36px pra caber na barra, cores/raios/sombras do sistema). CSS
// em globals.css (.fin-upgrade).
//
// Server Component: só ADMIN vê, e some quando a empresa já está no plano
// mais alto. Leva pra /configuracoes/planos (também só ADMIN).
export async function UpgradeButton() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return null;
  const plan = await getCompanyPlan(session.companyId);
  if (isTopPlan(plan.id)) return null;

  return (
    <Link href="/configuracoes/planos" className="fin-upgrade" aria-label="Upgrade de plano">
      <span className="fin-upgrade__inner">
        <span className="fin-upgrade__text">
          <span className="fin-upgrade__label">Upgrade</span>
          <span className="fin-upgrade__pro">PRO</span>
        </span>
        <span className="fin-upgrade__icon" aria-hidden="true">
          <ArrowUp size={13} strokeWidth={2.5} />
        </span>
      </span>
    </Link>
  );
}

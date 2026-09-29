import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getSession } from "@/lib/session";
import { isTopPlan } from "@/lib/plans";
import { getCompanyPlan } from "@/services/plans";

// Botão "Upgrade" da barra superior, à esquerda do sino.
// Referência visual: Uiverse.io (licença MIT) — simplificado: só branco
// (sem moldura cinza), 36px de altura pra caber na barra, seta reta pra
// direita. CSS em globals.css (.fin-upgrade).
//
// Server Component: só ADMIN vê, e some quando a empresa já está no plano
// mais alto. Leva pra /configuracoes/planos (também só ADMIN).
export async function UpgradeButton() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN" || !session.companyId) return null;
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
          <ArrowRight size={15} strokeWidth={1.75} />
        </span>
      </span>
    </Link>
  );
}

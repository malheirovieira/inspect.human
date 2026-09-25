import Link from "next/link";
import { formatPlanPrice, type Plan } from "@/lib/plans";

// Card "Seu plano" da Início — IDÊNTICO ao card de referência (mesma
// estrutura e classes Tailwind); a linha de descrição mostra o uso do mês e
// o botão é "Ver planos" (só ADMIN). Corrigido o erro da referência
// ("nline-flex").
// From Uiverse.io by emmanuelh-dev (licença MIT).
export function PlanSummaryCard({ plan, used, showPlansLink }: { plan: Plan; used: number; showPlansLink: boolean }) {
  return (
    <section aria-label="Seu plano" className="flex max-w-sm flex-col rounded-3xl bg-white">
      <div className={showPlansLink ? "px-6 py-8 sm:p-10 sm:pb-6" : "px-6 py-8 sm:p-10"}>
        <div className="grid w-full grid-cols-1 items-center justify-center text-left">
          <div>
            <h2 className="text-lg font-medium tracking-tighter text-gray-600 lg:text-3xl">{plan.name}</h2>
            <p className="mt-2 text-sm text-gray-500">
              {used.toLocaleString("pt-BR")} de {plan.aiResumeLimit.toLocaleString("pt-BR")} currículos analisados por IA
            </p>
          </div>
          <div className="mt-6">
            <p>
              <span className="text-5xl font-light tracking-tight text-black">{formatPlanPrice(plan)}</span>
              <span className="text-base font-medium text-gray-500"> /mês </span>
            </p>
          </div>
        </div>
      </div>
      {showPlansLink && (
        <div className="flex px-6 pb-8 sm:px-8">
          <Link
            href="/configuracoes/planos"
            className="flex w-full items-center justify-center rounded-full border-2 border-black bg-black px-6 py-2.5 text-center text-sm text-white duration-200 hover:border-black hover:bg-transparent hover:text-black focus:outline-none focus-visible:outline-black focus-visible:ring-black"
          >
            Ver planos
          </Link>
        </div>
      )}
    </section>
  );
}

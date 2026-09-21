import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { getHrKpis } from "@/services/kpis";
import { currentCompetence } from "@/schemas/budget";

function formatMoney(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatPercent(value: number): string {
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

function formatDays(value: number): string {
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} dias`;
}

function monthLabel(competence: string): string {
  const [year, month] = competence.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function KpisPage({
  searchParams,
}: {
  searchParams: Promise<{ competence?: string }>;
}) {
  const { competence: competenceParam } = await searchParams;
  const competence = competenceParam || currentCompetence();
  const kpis = await getHrKpis(competence);

  return (
    <>
      <Header eyebrow="GESTÃO" title="KPIs" />
      <div className="fin-content">
        <form method="get" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label htmlFor="competence" style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Competência
          </label>
          <input
            id="competence"
            name="competence"
            type="month"
            defaultValue={competence}
            className="fin-input"
            style={{ maxWidth: 180 }}
          />
          <button type="submit" className="fin-btn fin-btn--secondary">
            Atualizar
          </button>
        </form>

        <div className="fin-row" style={{ flexWrap: "wrap" }}>
          <StatCard
            label="Time-to-hire"
            value={kpis.timeToHire.avgDays !== null ? formatDays(kpis.timeToHire.avgDays) : "Sem dados"}
            meta={`${kpis.timeToHire.sampleSize} contratação(ões) no mês`}
            selected
          />
          <StatCard
            label="Desvio de budget"
            value={kpis.budgetDeviation.percent !== null ? formatPercent(kpis.budgetDeviation.percent) : "Sem dados"}
            meta={`${formatMoney(kpis.budgetDeviation.consumed)} de ${formatMoney(kpis.budgetDeviation.allocated)}`}
          />
          <StatCard
            label="Turnover"
            value={kpis.turnover.rate !== null ? formatPercent(kpis.turnover.rate) : "Sem dados"}
            meta={`${kpis.turnover.exits} saída(s) · ${kpis.turnover.admissions} admissão(ões)`}
          />
          <StatCard
            label="Turnover 90 dias"
            value={kpis.earlyTurnover.percent !== null ? formatPercent(kpis.earlyTurnover.percent) : "Sem dados"}
            meta={`${kpis.earlyTurnover.earlyExits} de ${kpis.earlyTurnover.totalExits} saída(s)`}
          />
          <StatCard
            label="Custo médio / colaborador"
            value={kpis.avgCostPerEmployee.value !== null ? formatMoney(kpis.avgCostPerEmployee.value) : "Sem dados"}
            meta={`${kpis.avgCostPerEmployee.headcount} ativo(s) · só salário base`}
          />
          <StatCard
            label="Candidatos inscritos"
            value={String(kpis.funnel.total)}
            meta={`${kpis.funnel.hired} contratado(s) no mês`}
          />
        </div>

        <Card style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <span className="fin-eyebrow">FUNIL DE RECRUTAMENTO</span>
            <div className="fin-heading" style={{ marginBottom: 0 }}>
              Candidatos inscritos em {monthLabel(competence)}
            </div>
          </div>
          {kpis.funnel.total === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
              Nenhuma candidatura recebida neste mês.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { label: "Inscritos", count: kpis.funnel.total },
                { label: "Foram para entrevista", count: kpis.funnel.interview },
                { label: "Chegaram à proposta", count: kpis.funnel.proposal },
                { label: "Contratados", count: kpis.funnel.hired },
              ].map((step) => {
                const percent = kpis.funnel.total > 0 ? (step.count / kpis.funnel.total) * 100 : 0;
                return (
                  <div key={step.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                      <span style={{ color: "var(--text-secondary)" }}>{step.label}</span>
                      <strong>
                        {step.count} ({formatPercent(percent)})
                      </strong>
                    </div>
                    <ProgressBar percent={percent} />
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
          Exibindo {monthLabel(competence)}. Time-to-hire considera vagas publicadas e candidatos contratados neste
          sistema — não inclui contratações feitas fora dele. Custo médio por colaborador usa só o salário base
          cadastrado; impostos e benefícios ainda não são lançados como valor monetário.
        </p>
      </div>
    </>
  );
}

import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { PieChart } from "lucide-react";
import { getBudgetSummary } from "@/services/budget";
import { categoryLabel, currentCompetence } from "@/schemas/budget";

function formatMoney(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function monthLabel(competence: string): string {
  const [year, month] = competence.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function GestaoRelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ competence?: string }>;
}) {
  const { competence: competenceParam } = await searchParams;
  const competence = competenceParam || currentCompetence();
  const summary = await getBudgetSummary(competence);
  const categoryKeys = summary[0] ? Object.keys(summary[0].categories) : [];

  const totals = categoryKeys.reduce(
    (acc, category) => {
      const allocated = summary.reduce((sum, d) => sum + d.categories[category].allocated, 0);
      const consumed = summary.reduce((sum, d) => sum + d.categories[category].consumed, 0);
      acc[category] = { allocated, consumed };
      return acc;
    },
    {} as Record<string, { allocated: number; consumed: number }>
  );

  const totalAllocated = Object.values(totals).reduce((sum, t) => sum + t.allocated, 0);
  const totalConsumed = Object.values(totals).reduce((sum, t) => sum + t.consumed, 0);

  return (
    <>
      <Header eyebrow="GESTÃO" title="Relatórios" />
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
            Ver
          </button>
        </form>

        {summary.length === 0 ? (
          <EmptyState
            icon={PieChart}
            title="Nenhum dado de orçamento ainda"
            description="Cadastre orçamentos em Gestão > Budget para ver os relatórios aqui."
          />
        ) : (
          <>
            <div className="fin-row">
              <StatCard label="Orçado no mês" value={formatMoney(totalAllocated)} selected />
              <StatCard label="Consumido no mês" value={formatMoney(totalConsumed)} />
              {categoryKeys.map((category) => (
                <StatCard
                  key={category}
                  label={categoryLabel(category)}
                  value={formatMoney(totals[category].consumed)}
                />
              ))}
            </div>

            <Card style={{ padding: 0 }}>
              <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)" }}>
                <span className="fin-eyebrow">POR DEPARTAMENTO — {monthLabel(competence).toUpperCase()}</span>
              </div>
              {summary.map((dept, index) => {
                const deptAllocated = categoryKeys.reduce((s, c) => s + dept.categories[c].allocated, 0);
                const deptConsumed = categoryKeys.reduce((s, c) => s + dept.categories[c].consumed, 0);
                const overBudget = deptAllocated > 0 && deptConsumed > deptAllocated;
                return (
                  <div
                    key={dept.department}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "16px 24px",
                      borderTop: index === 0 ? "none" : "1px solid var(--border)",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{dept.department}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                        {categoryKeys.map((c) => `${categoryLabel(c)}: ${formatMoney(dept.categories[c].consumed)}`).join(
                          " · "
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: overBudget ? "var(--danger)" : "var(--text-primary)" }}>
                        {formatMoney(deptConsumed)}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>de {formatMoney(deptAllocated)} orçado</div>
                    </div>
                  </div>
                );
              })}
            </Card>
          </>
        )}
      </div>
    </>
  );
}

import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { PieChartCard } from "@/components/ui/PieChartCard";
import { NewBudgetToggle } from "@/components/gestao/NewBudgetToggle";
import { NewExpenseToggle } from "@/components/gestao/NewExpenseToggle";
import { BudgetStatusToggle } from "@/components/gestao/BudgetStatusToggle";
import { CircleDollarSign, Pencil } from "lucide-react";
import { getBudgetSummary, listBudgets } from "@/services/budget";
import { listCompanyOptions } from "@/services/companyOptions";
import { categoryLabel, BUDGET_STATUSES, BUDGET_STATUS_LABELS, currentCompetence } from "@/schemas/budget";

const TABS = [
  { key: "resumo", label: "Resumo" },
  { key: "orcamentos", label: "Orçamentos" },
] as const;

const CHART_COLORS = ["#16A34A", "#2563EB", "#F59E0B", "#DC2626", "#7C3AED", "#0EA5E9", "#DB2777", "#65A30D"];

function formatMoney(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(date: Date | null): string {
  if (!date) return "Indeterminado";
  return date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function monthLabel(competence: string): string {
  const [year, month] = competence.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; chart?: string; competence?: string; department?: string; status?: string }>;
}) {
  const {
    tab,
    chart,
    competence: competenceParam,
    department: departmentFilter,
    status: statusFilter,
  } = await searchParams;
  const activeTab = TABS.some((t) => t.key === tab) ? tab! : "resumo";
  const chartMode = chart === "pizza" ? "pizza" : "barras";
  const competence = competenceParam || currentCompetence();

  const [summary, departmentOptions, categoryOptions, budgets] = await Promise.all([
    getBudgetSummary(competence),
    listCompanyOptions("SETOR"),
    listCompanyOptions("CATEGORIA_BUDGET"),
    listBudgets({ department: departmentFilter, status: statusFilter }),
  ]);

  const departments = departmentOptions.map((d) => d.label);
  const categories = categoryOptions.map((c) => c.label);
  const categoryKeys = summary[0] ? Object.keys(summary[0].categories) : [];

  return (
    <>
      <Header eyebrow="GESTÃO" title="Budget" />
      <div className="fin-content">
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
          <NewBudgetToggle departments={departments} categories={categories} />
          <NewExpenseToggle departments={departments} categories={categories} />
        </div>

        <div
          style={{
            display: "flex",
            gap: 4,
            borderBottom: "1px solid var(--border)",
          }}
        >
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/gestao/budget?tab=${t.key}`}
              style={{
                padding: "10px 16px",
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
                color: activeTab === t.key ? "var(--action-primary-text)" : "var(--text-muted)",
                borderBottom: activeTab === t.key ? "2px solid var(--action-primary)" : "2px solid transparent",
              }}
            >
              {t.label}
            </Link>
          ))}
        </div>

        {activeTab === "resumo" && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <form method="get" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="hidden" name="tab" value="resumo" />
                <input type="hidden" name="chart" value={chartMode} />
                <label htmlFor="competence" style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  Competência (resumo abaixo)
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

              <div style={{ display: "flex", gap: 4 }}>
                <Link href={`/gestao/budget?tab=resumo&chart=barras&competence=${competence}`}>
                  <button
                    type="button"
                    className={`fin-btn ${chartMode === "barras" ? "fin-btn--primary" : "fin-btn--secondary"}`}
                  >
                    Barras
                  </button>
                </Link>
                <Link href={`/gestao/budget?tab=resumo&chart=pizza&competence=${competence}`}>
                  <button
                    type="button"
                    className={`fin-btn ${chartMode === "pizza" ? "fin-btn--primary" : "fin-btn--secondary"}`}
                  >
                    Pizza
                  </button>
                </Link>
              </div>
            </div>

            {summary.length === 0 ? (
              <EmptyState
                icon={CircleDollarSign}
                title="Nenhum orçamento cadastrado"
                description="Cadastre setores e categorias em Configurações e aloque o orçamento mensal por departamento acima."
              />
            ) : (
              <div
                style={
                  chartMode === "pizza"
                    ? { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }
                    : { display: "flex", flexDirection: "column", gap: 16 }
                }
              >
                {summary.map((dept) => {
                  const deptAllocated = categoryKeys.reduce((s, c) => s + dept.categories[c].allocated, 0);
                  const deptConsumed = categoryKeys.reduce((s, c) => s + dept.categories[c].consumed, 0);
                  const deptPercent = deptAllocated > 0 ? (deptConsumed / deptAllocated) * 100 : deptConsumed > 0 ? 100 : 0;
                  const deptOverBudget = deptAllocated > 0 && deptConsumed > deptAllocated;

                  if (chartMode === "pizza") {
                    return (
                      <PieChartCard
                        key={dept.department}
                        title={`${dept.department} — total ${formatMoney(deptConsumed)} / ${formatMoney(deptAllocated)}`}
                        data={categoryKeys.map((category, i) => ({
                          name: categoryLabel(category),
                          value: dept.categories[category].consumed,
                          color: CHART_COLORS[i % CHART_COLORS.length],
                        }))}
                      />
                    );
                  }

                  return (
                    <Card key={dept.department} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      <div className="fin-heading" style={{ marginBottom: 0 }}>
                        {dept.department}
                      </div>

                      <div style={{ paddingBottom: 14, borderBottom: "1px solid var(--border)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                          <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>Total do setor</span>
                          <strong style={{ fontSize: 15, color: deptOverBudget ? "var(--danger)" : "var(--text-primary)" }}>
                            {formatMoney(deptConsumed)} / {formatMoney(deptAllocated)}
                          </strong>
                        </div>
                        <ProgressBar percent={deptPercent} />
                        {deptOverBudget && (
                          <span style={{ fontSize: 11, color: "var(--danger)" }}>
                            {formatMoney(deptConsumed - deptAllocated)} acima do orçado
                          </span>
                        )}
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
                        {categoryKeys.map((category) => {
                          const { allocated, consumed } = dept.categories[category];
                          const percent = allocated > 0 ? (consumed / allocated) * 100 : consumed > 0 ? 100 : 0;
                          const overBudget = allocated > 0 && consumed > allocated;
                          return (
                            <div key={category}>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                                <span style={{ color: "var(--text-secondary)" }}>{categoryLabel(category)}</span>
                                <strong style={{ color: overBudget ? "var(--danger)" : "var(--text-primary)" }}>
                                  {formatMoney(consumed)} / {formatMoney(allocated)}
                                </strong>
                              </div>
                              <ProgressBar percent={percent} />
                              {overBudget && (
                                <span style={{ fontSize: 11, color: "var(--danger)" }}>
                                  {formatMoney(consumed - allocated)} acima do orçado
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
              Resumo de {monthLabel(competence)}. Salário é calculado automaticamente pela soma dos salários dos
              colaboradores ativos de cada departamento — as demais categorias são lançadas manualmente acima.
            </p>
          </>
        )}

        {activeTab === "orcamentos" && (
          <>
            <div>
              <span className="fin-eyebrow">ORÇAMENTOS CADASTRADOS</span>
              <div className="fin-heading" style={{ marginBottom: 0 }}>
                Consultar, editar e suspender
              </div>
            </div>

            <form method="get" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <input type="hidden" name="tab" value="orcamentos" />
              <select name="department" defaultValue={departmentFilter ?? ""} className="fin-input" style={{ maxWidth: 200 }}>
                <option value="">Todos os departamentos</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <select name="status" defaultValue={statusFilter ?? ""} className="fin-input" style={{ maxWidth: 180 }}>
                <option value="">Todos os status</option>
                {BUDGET_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {BUDGET_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
              <button type="submit" className="fin-btn fin-btn--secondary">
                Filtrar
              </button>
            </form>

            {budgets.length === 0 ? (
              <EmptyState
                icon={CircleDollarSign}
                title="Nenhum orçamento encontrado"
                description="Ajuste os filtros ou cadastre um orçamento na aba Resumo."
              />
            ) : (
              <Card style={{ padding: 0 }}>
                {budgets.map((budget, index) => (
                  <div
                    key={budget.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "16px 24px",
                      borderTop: index === 0 ? "none" : "1px solid var(--border)",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>
                        {budget.department} · {categoryLabel(budget.category)}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                        {formatMoney(Number(budget.amount))} · vigência {formatDate(budget.startDate)} até{" "}
                        {formatDate(budget.endDate)}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Badge tone={budget.status === "ATIVO" ? "success" : "primary"}>
                        {BUDGET_STATUS_LABELS[budget.status as keyof typeof BUDGET_STATUS_LABELS]}
                      </Badge>
                      <Link href={`/gestao/budget/${budget.id}/editar`} className="fin-icon-btn" aria-label="Editar orçamento">
                        <Pencil size={15} />
                      </Link>
                      <BudgetStatusToggle budgetId={budget.id} status={budget.status as "ATIVO" | "SUSPENSO"} />
                    </div>
                  </div>
                ))}
              </Card>
            )}
          </>
        )}
      </div>
    </>
  );
}

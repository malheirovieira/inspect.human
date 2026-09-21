import { notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { BudgetEditForm } from "@/components/gestao/BudgetEditForm";
import { getBudget } from "@/services/budget";
import { listCompanyOptions } from "@/services/companyOptions";

function toDateInput(date: Date | null): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export default async function EditarBudgetPage({ params }: { params: Promise<{ budgetId: string }> }) {
  const { budgetId } = await params;
  const [budget, departmentOptions, categoryOptions] = await Promise.all([
    getBudget(budgetId),
    listCompanyOptions("SETOR"),
    listCompanyOptions("CATEGORIA_BUDGET"),
  ]);

  if (!budget) notFound();

  return (
    <>
      <Header
        title={`Editar orçamento — ${budget.department}`}
        backHref="/gestao/budget"
        breadcrumb={[{ label: "Gestão" }, { label: "Budget", href: "/gestao/budget" }, { label: "Editar" }]}
      />
      <div className="fin-content">
        <BudgetEditForm
          budgetId={budget.id}
          departments={departmentOptions.map((d) => d.label)}
          categories={categoryOptions.map((c) => c.label)}
          initial={{
            department: budget.department,
            category: budget.category,
            amount: budget.amount.toString(),
            startDate: toDateInput(budget.startDate),
            endDate: toDateInput(budget.endDate),
            status: budget.status as "ATIVO" | "SUSPENSO",
          }}
        />
      </div>
    </>
  );
}

"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Input, Select } from "@/components/ui/Field";
import { updateBudget } from "@/app/(dashboard)/gestao/budget/actions";
import { BUDGET_STATUSES, BUDGET_STATUS_LABELS } from "@/schemas/budget";

type Props = {
  budgetId: string;
  departments: string[];
  categories: string[];
  initial: {
    department: string;
    category: string;
    amount: string;
    startDate: string;
    endDate: string;
    status: (typeof BUDGET_STATUSES)[number];
  };
};

export function BudgetEditForm({ budgetId, departments, categories, initial }: Props) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await updateBudget(budgetId, {
      ...form,
      amount: form.amount as unknown as number,
      endDate: form.endDate || undefined,
    });

    setSubmitting(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    router.push("/gestao/budget");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          <FieldLabel label="Departamento" required>
            <Select required value={form.department} onChange={(e) => update("department", e.target.value)}>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
          </FieldLabel>
          <FieldLabel label="Categoria" required>
            <Select required value={form.category} onChange={(e) => update("category", e.target.value)}>
              {!categories.includes(form.category) && (
                <option key={form.category} value={form.category}>
                  {form.category}
                </option>
              )}
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </FieldLabel>
          <FieldLabel label="Valor mensal (R$)" required>
            <Input
              type="number"
              min="0"
              step="0.01"
              required
              value={form.amount}
              onChange={(e) => update("amount", e.target.value)}
            />
          </FieldLabel>
          <FieldLabel label="Status" required>
            <Select required value={form.status} onChange={(e) => update("status", e.target.value as (typeof BUDGET_STATUSES)[number])}>
              {BUDGET_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {BUDGET_STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </FieldLabel>
          <FieldLabel label="Vigora a partir de" required>
            <Input type="date" required value={form.startDate} onChange={(e) => update("startDate", e.target.value)} />
          </FieldLabel>
          <FieldLabel label="Até (opcional)">
            <Input type="date" value={form.endDate} onChange={(e) => update("endDate", e.target.value)} />
          </FieldLabel>
        </div>

        {error && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "var(--radius-md)",
              background: "var(--danger-surface)",
              color: "var(--danger)",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button type="submit" variant={submitting ? "disabled" : "primary"}>
            {submitting ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </Card>
    </form>
  );
}

"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Input, Select } from "@/components/ui/Field";
import { createBudget, createBudgetExpense } from "@/app/(dashboard)/gestao/budget/actions";

function Feedback({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <div
      style={{
        padding: "10px 14px",
        borderRadius: "var(--radius-md)",
        background: "var(--danger-surface)",
        color: "var(--danger)",
        fontSize: 13,
      }}
    >
      {error}
    </div>
  );
}

export function BudgetAllocationForm({
  departments,
  categories,
  onCreated,
}: {
  departments: string[];
  categories: string[];
  onCreated?: () => void;
}) {
  const router = useRouter();
  const [department, setDepartment] = useState(departments[0] ?? "");
  const [category, setCategory] = useState(categories[0] ?? "");
  const [amount, setAmount] = useState("");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await createBudget({
      department,
      category,
      amount: amount as unknown as number,
      startDate,
      endDate: endDate || undefined,
    });

    setSubmitting(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setAmount("");
    router.refresh();
    onCreated?.();
  }

  if (categories.length === 0) {
    return (
      <Card>
        <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)" }}>
          Cadastre uma categoria de budget em Configurações antes de alocar orçamento (ex.: Treinamento, Benefícios).
        </p>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <span className="fin-eyebrow">ALOCAR ORÇAMENTO</span>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          <FieldLabel label="Departamento" required>
            <Select required value={department} onChange={(e) => setDepartment(e.target.value)}>
              {departments.length === 0 && <option value="">Cadastre um setor em Configurações</option>}
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
          </FieldLabel>
          <FieldLabel label="Categoria" required>
            <Select required value={category} onChange={(e) => setCategory(e.target.value)}>
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
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </FieldLabel>
          <FieldLabel label="Vigora a partir de" required>
            <Input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </FieldLabel>
          <FieldLabel label="Até (opcional)">
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </FieldLabel>
        </div>
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
          Pode ser uma data futura — o orçamento passa a valer automaticamente a partir dela.
        </p>

        <Feedback error={error} />

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button type="submit" variant={submitting ? "disabled" : "primary"}>
            {submitting ? "Salvando..." : "Salvar orçamento"}
          </Button>
        </div>
      </Card>
    </form>
  );
}

export function BudgetExpenseForm({
  departments,
  categories,
  onCreated,
}: {
  departments: string[];
  categories: string[];
  onCreated?: () => void;
}) {
  const router = useRouter();
  const [department, setDepartment] = useState(departments[0] ?? "");
  const [category, setCategory] = useState(categories[0] ?? "");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await createBudgetExpense({
      department,
      category,
      description,
      amount: amount as unknown as number,
      expenseDate,
    });

    setSubmitting(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setAmount("");
    setDescription("");
    router.refresh();
    onCreated?.();
  }

  if (categories.length === 0) {
    return (
      <Card>
        <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)" }}>
          Cadastre uma categoria de budget em Configurações antes de lançar gastos (ex.: Treinamento, Benefícios).
        </p>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <span className="fin-eyebrow">LANÇAR GASTO</span>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          <FieldLabel label="Departamento" required>
            <Select required value={department} onChange={(e) => setDepartment(e.target.value)}>
              {departments.length === 0 && <option value="">Cadastre um setor em Configurações</option>}
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
          </FieldLabel>
          <FieldLabel label="Categoria" required>
            <Select required value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </FieldLabel>
          <FieldLabel label="Data" required>
            <Input type="date" required value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
          </FieldLabel>
          <FieldLabel label="Valor (R$)" required>
            <Input
              type="number"
              min="0"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </FieldLabel>
          <FieldLabel label="Descrição">
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: Workshop de vendas" />
          </FieldLabel>
        </div>

        <Feedback error={error} />

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button type="submit" variant={submitting ? "disabled" : "primary"}>
            {submitting ? "Salvando..." : "Lançar gasto"}
          </Button>
        </div>
      </Card>
    </form>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { setBudgetStatus } from "@/app/(dashboard)/gestao/budget/actions";

export function BudgetStatusToggle({ budgetId, status }: { budgetId: string; status: "ATIVO" | "SUSPENSO" }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleClick() {
    setSubmitting(true);
    await setBudgetStatus(budgetId, status === "ATIVO" ? "SUSPENSO" : "ATIVO");
    setSubmitting(false);
    router.refresh();
  }

  return (
    <Button type="button" variant={submitting ? "disabled" : "secondary"} onClick={handleClick}>
      {status === "ATIVO" ? "Suspender" : "Reativar"}
    </Button>
  );
}

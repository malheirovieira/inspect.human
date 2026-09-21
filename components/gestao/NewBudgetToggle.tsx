"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { BudgetAllocationForm } from "@/components/gestao/BudgetForms";

export function NewBudgetToggle({ departments, categories }: { departments: string[]; categories: string[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant={open ? "secondary" : "primary"} onClick={() => setOpen((prev) => !prev)}>
        {open ? (
          <>
            <X size={14} /> Cancelar
          </>
        ) : (
          <>
            <Plus size={14} /> Cadastrar orçamento
          </>
        )}
      </Button>
      {open && (
        <div style={{ width: "100%" }}>
          <BudgetAllocationForm departments={departments} categories={categories} onCreated={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}

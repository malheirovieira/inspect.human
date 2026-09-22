"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ListToolbar } from "@/components/ui/ListToolbar";
import { EmployeeExitForm } from "./EmployeeExitForm";
import { EXIT_TYPES, EXIT_TYPE_LABELS, EXIT_REASONS, EXIT_REASON_LABELS } from "@/schemas/employeeExit";

type Colaborador = { id: string; name: string; position: string | null; department: string | null };

export function DesligamentosToolbar({ colaboradores }: { colaboradores: Colaborador[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <ListToolbar
          searchPlaceholder="Buscar por nome..."
          filters={[
            {
              key: "exitType",
              label: "Todos os tipos",
              options: EXIT_TYPES.map((t) => ({ value: t, label: EXIT_TYPE_LABELS[t] })),
            },
            {
              key: "reason",
              label: "Todos os motivos",
              options: EXIT_REASONS.map((r) => ({ value: r, label: EXIT_REASON_LABELS[r] })),
            },
          ]}
        />
        <Button type="button" variant={open ? "secondary" : "primary"} onClick={() => setOpen((prev) => !prev)}>
          {open ? (
            <>
              <X size={14} /> Cancelar
            </>
          ) : (
            <>
              <Plus size={14} /> Registrar desligamento
            </>
          )}
        </Button>
      </div>

      {open && (
        <div style={{ width: "100%" }}>
          <EmployeeExitForm colaboradores={colaboradores} onCreated={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}

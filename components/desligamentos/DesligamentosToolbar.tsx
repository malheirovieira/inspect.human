"use client";

import { useState } from "react";
import { Plus, X, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ListToolbar } from "@/components/ui/ListToolbar";
import { EmployeeExitForm } from "./EmployeeExitForm";
import { ImportExitHistoryPanel } from "./ImportExitHistoryPanel";
import { EXIT_TYPES, EXIT_TYPE_LABELS, EXIT_REASONS, EXIT_REASON_LABELS } from "@/schemas/employeeExit";

type Colaborador = { id: string; name: string; position: string | null; department: string | null };

export function DesligamentosToolbar({ colaboradores }: { colaboradores: Colaborador[] }) {
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

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
        <div style={{ display: "flex", gap: 8 }}>
          <Button
            type="button"
            variant="secondary"
            title="Importar histórico"
            onClick={() => {
              setImportOpen((prev) => !prev);
              setOpen(false);
            }}
          >
            <Upload size={14} />
            Importar histórico
          </Button>
          <Button
            type="button"
            variant={open ? "round-cancel" : "round-add"}
            title={open ? "Cancelar" : "Registrar desligamento"}
            aria-label={open ? "Cancelar" : "Registrar desligamento"}
            onClick={() => {
              setOpen((prev) => !prev);
              setImportOpen(false);
            }}
          >
            {open ? <X size={18} /> : <Plus size={18} />}
          </Button>
        </div>
      </div>

      {open && (
        <div style={{ width: "100%" }}>
          <EmployeeExitForm colaboradores={colaboradores} onCreated={() => setOpen(false)} />
        </div>
      )}

      {importOpen && (
        <div style={{ width: "100%" }}>
          <ImportExitHistoryPanel onClose={() => setImportOpen(false)} />
        </div>
      )}
    </>
  );
}

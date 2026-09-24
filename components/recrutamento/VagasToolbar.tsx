"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ListToolbar } from "@/components/ui/ListToolbar";
import { JobForm } from "./JobForm";

export function VagasToolbar({
  employmentTypeOptions,
  departmentOptions,
}: {
  employmentTypeOptions: string[];
  departmentOptions: string[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <ListToolbar
          searchPlaceholder="Buscar por título ou local..."
          filters={[
            {
              key: "status",
              label: "Todos os status",
              options: [
                { value: "OPEN", label: "Aberta" },
                { value: "DRAFT", label: "Rascunho" },
                { value: "CLOSED", label: "Fechada" },
              ],
            },
          ]}
        />
        <Button
          type="button"
          variant={open ? "round-cancel" : "round-add"}
          title={open ? "Cancelar" : "Nova vaga"}
          aria-label={open ? "Cancelar" : "Nova vaga"}
          onClick={() => setOpen((prev) => !prev)}
        >
          {open ? <X size={18} /> : <Plus size={18} />}
        </Button>
      </div>

      {open && (
        <div style={{ width: "100%" }}>
          <JobForm employmentTypeOptions={employmentTypeOptions} departmentOptions={departmentOptions} />
        </div>
      )}
    </>
  );
}

"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmployeeExitForm } from "@/components/desligamentos/EmployeeExitForm";

type Colaborador = { id: string; name: string; position: string | null; department: string | null };

export function NewExitToggle({ colaboradores }: { colaboradores: Colaborador[] }) {
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
            <Plus size={14} /> Registrar desligamento
          </>
        )}
      </Button>
      {open && (
        <div style={{ width: "100%" }}>
          <EmployeeExitForm colaboradores={colaboradores} onCreated={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}

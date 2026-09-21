"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function NewCandidateToggle({ children }: { children: React.ReactNode }) {
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
            <Plus size={14} /> Cadastrar candidato
          </>
        )}
      </Button>
      {open && <div style={{ width: "100%" }}>{children}</div>}
    </>
  );
}

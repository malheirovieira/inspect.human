"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

// Botão "Nova vaga" que expande/recolhe o formulário logo abaixo, em vez de
// navegar pra uma página separada — o formulário é grande, então some por
// padrão e só ocupa espaço quando alguém realmente for criar uma vaga.
export function NewJobToggle({ children }: { children: React.ReactNode }) {
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
            <Plus size={14} /> Nova vaga
          </>
        )}
      </Button>
      {open && <div style={{ width: "100%" }}>{children}</div>}
    </>
  );
}

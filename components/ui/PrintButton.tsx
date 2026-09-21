"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";

// window.print() já abre o diálogo "Salvar como PDF" nativo do navegador —
// não precisa de nenhuma lib de geração de PDF no servidor pra isso.
export function PrintButton() {
  return (
    <Button type="button" variant="secondary" className="no-print" onClick={() => window.print()}>
      <Printer size={14} /> Imprimir / Salvar PDF
    </Button>
  );
}

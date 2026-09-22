"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ListToolbar } from "@/components/ui/ListToolbar";
import { CandidateManualForm } from "./CandidateManualForm";

type Job = { id: string; title: string };
type FilterOption = { value: string; label: string };

// Junta a linha de filtros/Lista/Kanban/Cadastrar num único componente client
// pra poder compartilhar o estado "open" entre o botão (que fica na linha,
// ao lado dos outros) e o formulário (que expande abaixo, ocupando a largura
// toda) — sem isso os dois ficam presos ao mesmo lugar na árvore, e um dos
// dois posicionamentos sempre sai errado.
export function CandidatesToolbar({
  isKanban,
  baseQuery,
  stageOptions,
  tagOptions,
  jobs,
}: {
  isKanban: boolean;
  baseQuery: Record<string, string>;
  stageOptions: FilterOption[];
  tagOptions: FilterOption[];
  jobs: Job[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <ListToolbar
          searchPlaceholder="Buscar por nome ou e-mail..."
          filters={[
            { key: "stage", label: "Todas as etapas", options: stageOptions },
            { key: "tag", label: "Todas as tags", options: tagOptions },
          ]}
        />
        <div style={{ display: "flex", gap: 8 }}>
          <Link href={{ pathname: "/recrutamento/candidatos", query: baseQuery }}>
            <Button variant={isKanban ? "secondary" : "primary"}>Lista</Button>
          </Link>
          <Link href={{ pathname: "/recrutamento/candidatos", query: { ...baseQuery, view: "kanban" } }}>
            <Button variant={isKanban ? "primary" : "secondary"}>Kanban</Button>
          </Link>
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
        </div>
      </div>

      {open && (
        <div style={{ width: "100%" }}>
          <CandidateManualForm jobs={jobs} onCreated={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}

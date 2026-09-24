"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
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
  const router = useRouter();

  function handleViewChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(baseQuery);
    if (e.target.value === "kanban") params.set("view", "kanban");
    router.push(`/recrutamento/candidatos?${params.toString()}`);
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <ListToolbar
          searchPlaceholder="Buscar por nome ou e-mail..."
          filters={[
            { key: "stage", label: "Todas as etapas", options: stageOptions },
            { key: "tag", label: "Todas as tags", options: tagOptions },
          ]}
        >
          <Select
            className="fin-filter-select"
            value={isKanban ? "kanban" : "list"}
            onChange={handleViewChange}
            style={{ flexShrink: 0, width: 140 }}
            aria-label="Visualização"
          >
            <option value="list">Lista</option>
            <option value="kanban">Kanban</option>
          </Select>
        </ListToolbar>
        <Button
          type="button"
          variant={open ? "round-cancel" : "round-add"}
          title={open ? "Cancelar" : "Cadastrar candidato"}
          aria-label={open ? "Cancelar" : "Cadastrar candidato"}
          onClick={() => setOpen((prev) => !prev)}
        >
          {open ? <X size={18} /> : <Plus size={18} />}
        </Button>
      </div>

      {open && (
        <div style={{ width: "100%" }}>
          <CandidateManualForm jobs={jobs} onCreated={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}

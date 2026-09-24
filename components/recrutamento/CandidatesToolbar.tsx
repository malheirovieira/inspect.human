"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ListToolbar } from "@/components/ui/ListToolbar";
import { CandidateManualForm } from "./CandidateManualForm";

type Job = { id: string; title: string };
type FilterOption = { value: string; label: string };

// Sem seletor de visualização: Banco de Talentos é só lista (o Kanban fica
// dentro de cada vaga, em /recrutamento/vagas/[jobId]?tab=candidatos).
export function CandidatesToolbar({
  stageOptions,
  tagOptions,
  jobOptions,
  skillOptions = [],
  jobs,
}: {
  stageOptions: FilterOption[];
  tagOptions: FilterOption[];
  jobOptions: FilterOption[];
  // Tags de competência do resumo por IA em uso na empresa.
  skillOptions?: FilterOption[];
  jobs: Job[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <ListToolbar
          searchPlaceholder="Buscar por nome ou e-mail..."
          filters={[
            { key: "jobId", label: "Todas as vagas", options: jobOptions },
            { key: "stage", label: "Todas as etapas", options: stageOptions },
            { key: "tag", label: "Todas as tags", options: tagOptions },
            ...(skillOptions.length > 0 ? [{ key: "skill", label: "Todas as competências", options: skillOptions }] : []),
          ]}
        />
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

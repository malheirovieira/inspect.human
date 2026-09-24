"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { FieldErrors } from "@/lib/fieldErrors";

// Padrão ÚNICO de "cadastro existente abre bloqueado" (vaga, perfil do
// candidato — e o que vier): campos cinzas/somente leitura + "Editar";
// "Editar" libera e vira "Atualizar" (verde) com um "X" (vermelho) ao lado
// que descarta as alterações; "Atualizar" salva e, dando certo, bloqueia de
// novo. Erro de validação mantém os campos liberados, com o que foi digitado.
// Cadastro novo (isExisting=false) não bloqueia.
export function useEditLock<T>(initial: T, isExisting: boolean) {
  const [values, setValues] = useState<T>(initial);
  // Últimos valores SALVOS — o "X" volta pra eles.
  const [saved, setSaved] = useState<T>(initial);
  const [locked, setLocked] = useState(isExisting);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  return {
    values,
    setValues,
    locked: isExisting && locked,
    fieldErrors,
    setFieldErrors,
    startEdit: () => setLocked(false),
    cancel: () => {
      setValues(saved);
      setFieldErrors({});
      setLocked(true);
    },
    // Chamar depois de salvar com sucesso.
    commit: (next: T) => {
      setSaved(next);
      setFieldErrors({});
      setLocked(true);
    },
  };
}

export function EditLockActions({
  isExisting,
  locked,
  submitting,
  createLabel = "Salvar",
  onEdit,
  onCancel,
}: {
  isExisting: boolean;
  locked: boolean;
  submitting: boolean;
  createLabel?: string;
  onEdit: () => void;
  onCancel: () => void;
}) {
  if (!isExisting) {
    return (
      <Button type="submit" variant={submitting ? "disabled" : "confirm"}>
        {submitting ? "Salvando..." : createLabel}
      </Button>
    );
  }

  if (locked) {
    // key diferente do "Atualizar": elemento novo no DOM, então o clique em
    // "Editar" nunca vira submit do formulário.
    return (
      <Button key="edit" type="button" variant="secondary" onClick={onEdit}>
        Editar
      </Button>
    );
  }

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <Button
        key="cancel"
        type="button"
        variant="icon-cancel"
        onClick={onCancel}
        disabled={submitting}
        title="Cancelar edição"
        aria-label="Cancelar edição"
      >
        <X size={18} />
      </Button>
      <Button key="save" type="submit" variant={submitting ? "disabled" : "confirm"}>
        {submitting ? "Salvando..." : "Atualizar"}
      </Button>
    </div>
  );
}

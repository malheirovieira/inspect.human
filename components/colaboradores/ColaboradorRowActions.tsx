"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { deleteColaborador } from "@/app/(dashboard)/colaboradores/actions";

export function ColaboradorRowActions({ colaboradorId, name }: { colaboradorId: string; name: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir "${name}"? Isso apaga o colaborador de todo o sistema, incluindo ponto, treinamentos e folha vinculados a ele. Essa ação não pode ser desfeita.`
    );
    if (!confirmed) return;

    setDeleting(true);
    const result = await deleteColaborador(colaboradorId);
    setDeleting(false);

    if (result && "error" in result) {
      window.alert(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div
      className="opacity-0 transition-opacity duration-200 group-hover:opacity-100"
      style={{ display: "flex", alignItems: "center", gap: 4 }}
    >
      <Link
        href={`/colaboradores/${colaboradorId}/editar`}
        aria-label={`Editar ${name}`}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 32,
          height: 32,
          borderRadius: "var(--radius-sm)",
          color: "var(--text-secondary)",
        }}
      >
        <Pencil size={16} />
      </Link>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        aria-label={`Excluir ${name}`}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 32,
          height: 32,
          borderRadius: "var(--radius-sm)",
          border: "none",
          background: "none",
          color: "var(--danger)",
          cursor: deleting ? "not-allowed" : "pointer",
        }}
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { deleteColaborador } from "@/app/(dashboard)/colaboradores/actions";

export function ColaboradorRowActions({ colaboradorId, name }: { colaboradorId: string; name: string }) {
  const router = useRouter();

  async function handleDelete() {
    const result = await deleteColaborador(colaboradorId);
    if (result && "error" in result) throw new Error(result.error);
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
      <DeleteButton
        onConfirm={handleDelete}
        ariaLabel={`Excluir ${name}`}
        variant="ghost"
        confirmMessage={`Tem certeza que deseja excluir "${name}"? Isso apaga o colaborador de todo o sistema, incluindo ponto, treinamentos e folha vinculados a ele. Essa ação não pode ser desfeita.`}
      />
    </div>
  );
}

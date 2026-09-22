"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteJob } from "@/app/(dashboard)/recrutamento/vagas/actions";

export function JobDeleteButton({ jobId, title }: { jobId: string; title: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir a vaga "${title}"? Isso apaga também todos os candidatos recebidos por ela. Essa ação não pode ser desfeita.`
    );
    if (!confirmed) return;

    setDeleting(true);
    const result = await deleteJob(jobId);

    if (result && "error" in result) {
      setDeleting(false);
      window.alert(result.error);
      return;
    }
    router.push("/recrutamento/vagas");
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      aria-label={`Excluir vaga ${title}`}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 44,
        height: 44,
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border)",
        background: "var(--surface)",
        color: "var(--danger)",
        cursor: deleting ? "not-allowed" : "pointer",
      }}
    >
      <Trash2 size={16} />
    </button>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { deleteJob } from "@/app/(dashboard)/recrutamento/vagas/actions";

export function JobDeleteButton({ jobId, title }: { jobId: string; title: string }) {
  const router = useRouter();

  async function handleDelete() {
    const result = await deleteJob(jobId);
    if (result && "error" in result) throw new Error(result.error);
    router.push("/recrutamento/vagas");
  }

  return (
    <DeleteButton
      onConfirm={handleDelete}
      ariaLabel={`Excluir vaga ${title}`}
      label="Excluir vaga"
      confirmMessage={`Tem certeza que deseja excluir a vaga "${title}"? Isso apaga também todos os candidatos recebidos por ela. Essa ação não pode ser desfeita.`}
    />
  );
}

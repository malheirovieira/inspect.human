"use client";

import { useRouter } from "next/navigation";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { deleteCandidate } from "@/app/(dashboard)/recrutamento/banco-de-talentos/actions";

export function DeleteCandidateButton({
  candidateId,
  candidateName,
  jobId,
}: {
  candidateId: string;
  candidateName: string;
  jobId: string;
}) {
  const router = useRouter();

  async function handleDelete() {
    const result = await deleteCandidate(candidateId, jobId);
    if ("error" in result) throw new Error(result.error);
    router.push(`/recrutamento/vagas/${jobId}?tab=candidatos`);
  }

  return (
    <DeleteButton
      onConfirm={handleDelete}
      ariaLabel={`Excluir candidato ${candidateName}`}
      label="Excluir candidato"
      confirmMessage={`Tem certeza que deseja excluir ${candidateName}? Isso apaga TODAS as candidaturas dessa pessoa, em qualquer vaga (entrevistas agendadas e e-mails enviados incluídos). Essa ação não pode ser desfeita.`}
    />
  );
}

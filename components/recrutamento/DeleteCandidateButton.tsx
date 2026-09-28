"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteCandidate } from "@/app/(dashboard)/recrutamento/banco-de-talentos/actions";

// Candidate é a pessoa (reaproveitada entre candidaturas) — deletar aqui
// remove TODAS as candidaturas dela, em qualquer vaga, não só a que está
// sendo vista. O confirm avisa isso explicitamente.
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
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir ${candidateName}? Isso apaga TODAS as candidaturas dessa pessoa, em qualquer vaga (entrevistas agendadas e e-mails enviados incluídos). Essa ação não pode ser desfeita.`
    );
    if (!confirmed) return;

    setDeleting(true);
    const result = await deleteCandidate(candidateId, jobId);

    if ("error" in result) {
      setDeleting(false);
      window.alert(result.error);
      return;
    }
    router.push(`/recrutamento/vagas/${jobId}?tab=candidatos`);
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      className="fin-btn fin-btn--danger"
      style={{ opacity: deleting ? 0.7 : 1 }}
    >
      <Trash2 size={16} />
      {deleting ? "Excluindo..." : "Excluir candidato"}
    </button>
  );
}

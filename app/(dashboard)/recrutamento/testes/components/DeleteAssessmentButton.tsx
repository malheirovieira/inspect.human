'use client';

import { useState } from 'react';
import { deleteAssessment } from '@/lib/actions/assessments';
import { useRouter } from 'next/navigation';

interface DeleteAssessmentButtonProps {
  id: string;
  hasResponses: boolean;
  title: string;
}

export function DeleteAssessmentButton({
  id,
  hasResponses,
  title,
}: DeleteAssessmentButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Deseja realmente deletar "${title}"?`)) return;

    setIsDeleting(true);
    try {
      const result = await deleteAssessment(id);
      if (!result.success) {
        alert(result.error || 'Erro ao deletar teste');
        return;
      }
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  };

  if (hasResponses) {
    return (
      <button
        disabled
        title="Não é possível deletar testes com respostas"
        className="w-full px-3 py-2 text-sm text-gray-400 bg-gray-100 rounded-lg cursor-not-allowed opacity-50"
      >
        Deletar
      </button>
    );
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="w-full px-3 py-2 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors font-medium disabled:opacity-50"
    >
      {isDeleting ? 'Deletando...' : 'Deletar'}
    </button>
  );
}

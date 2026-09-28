'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
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
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteAssessment(id);

    if (!result.success) {
      alert(result.error || 'Erro ao deletar teste');
      setIsDeleting(false);
      return;
    }

    router.refresh();
  };

  if (hasResponses) {
    return (
      <button
        disabled
        title="Não é possível deletar testes com respostas"
        className="px-3 py-2 text-sm text-gray-400 bg-gray-100 rounded cursor-not-allowed opacity-50"
      >
        <Trash2 size={16} />
      </button>
    );
  }

  if (showConfirm) {
    return (
      <div className="flex gap-1">
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
        >
          {isDeleting ? 'Deletando...' : 'Confirmar'}
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          disabled={isDeleting}
          className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      title={`Deletar "${title}"`}
      className="px-3 py-2 text-sm text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors"
    >
      <Trash2 size={16} />
    </button>
  );
}

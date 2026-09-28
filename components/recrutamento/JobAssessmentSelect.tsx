'use client';

import { useState } from 'react';
import { updateJobAssessment } from '@/lib/actions/updateJobAssessment';
import { useRouter } from 'next/navigation';
import { Prisma } from '@prisma/client';

type AssessmentWithCounts = Prisma.AssessmentGetPayload<{
  include: {
    questions: { select: { id: true } };
    responses: { where: { submittedAt: { not: null } }; select: { id: true } };
  };
}>;

interface JobAssessmentSelectProps {
  jobId: string;
  currentAssessmentId: string | null;
  assessments: AssessmentWithCounts[];
  locked?: boolean;
}

export function JobAssessmentSelect({
  jobId,
  currentAssessmentId,
  assessments,
  locked = false,
}: JobAssessmentSelectProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleChange = async (newAssessmentId: string) => {
    setIsUpdating(true);
    const assessmentId = newAssessmentId === '' ? null : newAssessmentId;

    const result = await updateJobAssessment(jobId, assessmentId);

    if (!result.success) {
      alert(result.error || 'Erro ao atualizar teste');
    } else {
      router.refresh();
    }

    setIsUpdating(false);
  };

  return (
    <div>
      <label htmlFor="assessment" className="block text-sm font-medium text-gray-700 mb-2">
        Teste (Fase 2)
      </label>
      <select
        id="assessment"
        value={currentAssessmentId || ''}
        onChange={(e) => handleChange(e.target.value)}
        disabled={locked || isUpdating}
        className="block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100 disabled:text-gray-500"
      >
        <option value="">(Nenhum)</option>
        {assessments.map((assessment) => (
          <option key={assessment.id} value={assessment.id}>
            {assessment.title} ({assessment.questions.length} perguntas, {assessment.totalScore} pts)
          </option>
        ))}
      </select>
      {isUpdating && (
        <p className="text-xs text-gray-500 mt-1">Atualizando...</p>
      )}
    </div>
  );
}

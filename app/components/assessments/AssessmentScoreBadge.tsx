'use client';

import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { fetchAssessmentResult } from '@/lib/assessments/client';
import { AssessmentResultsDrawer } from './AssessmentResultsDrawer';
import { AssessmentResultData } from '@/lib/types/assessments';

interface AssessmentScoreBadgeProps {
  applicationId: string;
}

export function AssessmentScoreBadge({ applicationId }: AssessmentScoreBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [result, setResult] = useState<AssessmentResultData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleOpenDrawer = async () => {
    if (result) {
      setIsOpen(true);
      return;
    }

    setIsLoading(true);
    try {
      const data = await fetchAssessmentResult(applicationId);
      if (data) {
        setResult(data);
        setIsOpen(true);
      }
    } catch (err) {
      console.error('Failed to load assessment result:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!result) {
    return null;
  }

  const percentage = Math.round(
    (result.response.score / result.assessment.totalScore) * 100
  );

  return (
    <>
      <button
        onClick={handleOpenDrawer}
        disabled={isLoading}
        className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium hover:bg-green-200 transition-colors cursor-pointer group"
        title="Clique para ver respostas"
      >
        <CheckCircle2 size={14} />
        <span>{result.response.score}/{result.assessment.totalScore} pts</span>
        <span className="text-green-600 group-hover:text-green-800 opacity-0 group-hover:opacity-100 transition-opacity">
          →
        </span>
      </button>

      {isOpen && result && (
        <AssessmentResultsDrawer
          data={result}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

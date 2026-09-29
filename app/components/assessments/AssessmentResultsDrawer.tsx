'use client';

import { AssessmentResultData } from '@/lib/types/assessments';
import { X } from 'lucide-react';

interface AssessmentResultsDrawerProps {
  data: AssessmentResultData;
  onClose: () => void;
}

export function AssessmentResultsDrawer({
  data,
  onClose,
}: AssessmentResultsDrawerProps) {
  const { assessment, response, answers } = data;
  const percentage = Math.round(
    (response.score / assessment.totalScore) * 100
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center sm:justify-end">
      <div className="w-full sm:max-w-2xl bg-white shadow-xl rounded-t-lg sm:rounded-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {assessment.title}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Resultados da avaliação
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Score Summary */}
        <div className="px-6 py-6 bg-gradient-to-r from-green-50 to-green-100 border-b border-green-200">
          <div className="text-center">
            <div className="text-4xl font-bold text-green-700">
              {response.score}/{assessment.totalScore}
            </div>
            <p className="text-sm text-green-600 mt-2">
              {percentage}% de acerto
            </p>
            <p className="text-xs text-green-600 mt-1">
              Respondido em{' '}
              {new Date(response.submittedAt).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>

        {/* Answers */}
        <div className="divide-y divide-gray-200">
          {answers.map((answer, idx) => (
            <div key={answer.questionId} className="px-6 py-4">
              <div className="flex items-start gap-3">
                <span className="text-sm font-semibold text-gray-500 flex-shrink-0 w-6 pt-0.5">
                  {idx + 1}.
                </span>
                <div className="flex-1">
                  <h4 className="text-base font-medium text-gray-900">
                    {answer.questionText}
                  </h4>

                  {/* Badge correctness */}
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        answer.isCorrect
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {answer.isCorrect ? '✓ Correto' : '✗ Incorreto'}
                    </span>
                    <span className="text-xs text-gray-600">
                      {answer.score}/{answer.maxScore} pts
                    </span>
                  </div>

                  {/* Response */}
                  <div className="mt-3 p-3 bg-gray-50 rounded">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Sua resposta:</span>{' '}
                      {answer.chosenChoiceText}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 text-gray-900 rounded-md font-medium hover:bg-gray-200 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

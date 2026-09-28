'use client';

import { useState } from 'react';
import { submitAssessment } from '@/app/actions/submitAssessment';
import { AssessmentPublicData, AssessmentResponsePayload } from '@/lib/types/assessments';

interface AssessmentFormProps {
  assessment: AssessmentPublicData;
  token: string;
  onSuccess: (score: number) => void;
}

export function AssessmentForm({
  assessment,
  token,
  onSuccess,
}: AssessmentFormProps) {
  const [answers, setAnswers] = useState<AssessmentResponsePayload>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectChoice = (questionId: string, choiceId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: choiceId,
    }));
    setError(null);
  };

  const isComplete = assessment.questions.every((q) => answers[q.id]);

  const handleSubmit = async () => {
    if (!isComplete) {
      setError('Por favor, responda todas as perguntas');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitAssessment(token, answers);

      if (!result.success) {
        setError(result.error || 'Erro ao enviar respostas');
        setIsSubmitting(false);
        return;
      }

      onSuccess(result.score || 0);
    } catch (err) {
      setError('Erro inesperado ao enviar respostas');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{assessment.title}</h1>
        {assessment.description && (
          <p className="text-gray-600 mt-2">{assessment.description}</p>
        )}
        <p className="text-sm text-gray-500 mt-4">
          Pontuação total: <strong>{assessment.totalScore} pts</strong>
        </p>
      </div>

      {/* Erros */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Perguntas */}
      <div className="space-y-6">
        {assessment.questions.map((question, idx) => (
          <div
            key={question.id}
            className="p-4 border border-gray-200 rounded-lg"
          >
            <div className="flex items-start gap-3">
              <span className="text-sm font-semibold text-gray-500 flex-shrink-0 w-6">
                {idx + 1}.
              </span>
              <div className="flex-1">
                <h3 className="text-base font-medium text-gray-900">
                  {question.text}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  ({question.maxScore} {question.maxScore === 1 ? 'ponto' : 'pontos'})
                </p>

                {/* Radio buttons */}
                <div className="space-y-2 mt-4">
                  {question.choices.map((choice) => (
                    <label
                      key={choice.id}
                      className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-gray-50"
                    >
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        value={choice.id}
                        checked={answers[question.id] === choice.id}
                        onChange={() =>
                          handleSelectChoice(question.id, choice.id)
                        }
                        className="w-4 h-4 text-green-600 border-gray-300"
                      />
                      <span className="text-gray-700">{choice.text}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Botão Submit */}
      <div className="flex gap-3">
        <button
          onClick={handleSubmit}
          disabled={!isComplete || isSubmitting}
          className={`px-6 py-2 rounded-md font-medium transition-colors ${
            isComplete && !isSubmitting
              ? 'bg-green-700 text-white hover:bg-green-800'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isSubmitting ? 'Enviando...' : 'Enviar Respostas'}
        </button>
      </div>

      {/* Indicador de progresso */}
      <div className="text-xs text-gray-600">
        Respondidas: <strong>{Object.keys(answers).length}</strong> de{' '}
        <strong>{assessment.questions.length}</strong>
      </div>
    </div>
  );
}

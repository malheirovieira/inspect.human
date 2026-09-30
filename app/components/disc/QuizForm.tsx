"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitQuizAssessment } from "@/app/actions/submitQuizAssessment";
import type { PublicAssessmentData } from "@/lib/types/disc";

type QuizPublicData = Extract<PublicAssessmentData, { type: "QUIZ" }>;

export function QuizForm({ data, token }: { data: QuizPublicData; token: string }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = data.questions.length;
  const answeredCount = Object.keys(answers).length;
  const isComplete = answeredCount === total;

  async function handleSubmit() {
    if (!isComplete) {
      setError("Responda todas as perguntas antes de enviar.");
      return;
    }
    setSubmitting(true);
    setError(null);

    const result = await submitQuizAssessment(token, answers);
    if (!result.success) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    router.push(`/avaliacao/${token}/sucesso`);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{data.title}</h1>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="space-y-6">
        {data.questions.map((question, idx) => (
          <div key={question.id} className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-start gap-3">
              <span className="text-sm font-semibold text-gray-500 flex-shrink-0 w-8">{idx + 1}.</span>
              <div className="flex-1">
                <p className="text-base font-medium text-gray-900 mb-4">{question.text}</p>
                <div className="space-y-2">
                  {question.choices.map((choice) => (
                    <label
                      key={choice.id}
                      className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-gray-50"
                    >
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        checked={answers[question.id] === choice.id}
                        onChange={() => {
                          setAnswers((prev) => ({ ...prev, [question.id]: choice.id }));
                          setError(null);
                        }}
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

      <div className="flex items-center justify-between gap-4 sticky bottom-0 bg-white pt-4 pb-2 border-t border-gray-100">
        <span className="text-xs text-gray-600">
          Respondidas: <strong>{answeredCount}</strong> de <strong>{total}</strong>
        </span>
        <button
          onClick={handleSubmit}
          disabled={!isComplete || submitting}
          className="fin-btn fin-btn--confirm"
        >
          {submitting ? "Enviando..." : "Enviar Avaliação"}
        </button>
      </div>
    </div>
  );
}

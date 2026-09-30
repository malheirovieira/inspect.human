"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitDiscAssessment } from "@/app/actions/submitDiscAssessment";
import type { PublicAssessmentData } from "@/lib/types/disc";

type DiscPublicData = Extract<PublicAssessmentData, { type: "DISC" }>;

const LIKERT_LABELS: Record<number, string> = {
  1: "Discordo totalmente",
  2: "Discordo",
  3: "Neutro",
  4: "Concordo",
  5: "Concordo totalmente",
};

const SECTION_LABELS: Record<string, string> = {
  COMPETENCIAS: "Parte 1 — Competências",
  DISC: "Parte 2 — Perfil Comportamental",
};

export function DiscForm({ data, token }: { data: DiscPublicData; token: string }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = data.questions.length;
  const answeredCount = Object.keys(answers).length;
  const isComplete = answeredCount === total;

  async function handleSubmit() {
    if (!isComplete) {
      setError("Responda todas as afirmações antes de enviar.");
      return;
    }
    setSubmitting(true);
    setError(null);

    const result = await submitDiscAssessment(token, answers);
    if (!result.success) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    router.push(`/avaliacao/${token}/sucesso`);
  }

  let lastSection: string | null = null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{data.title}</h1>
        <p className="text-sm text-gray-500 mt-2">
          Responda cada afirmação de acordo com o quanto ela descreve você, numa escala de 1 a 5.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="space-y-6">
        {data.questions.map((question, idx) => {
          const showSectionHeader = question.section !== lastSection;
          lastSection = question.section;

          return (
            <div key={question.id}>
              {showSectionHeader && (
                <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-4 pb-2 border-b border-gray-200">
                  {SECTION_LABELS[question.section] ?? question.section}
                </h2>
              )}
              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <span className="text-sm font-semibold text-gray-500 flex-shrink-0 w-8">{idx + 1}.</span>
                  <div className="flex-1">
                    <p className="text-base font-medium text-gray-900">{question.text}</p>

                    <div className="flex items-center justify-between mt-4 gap-2">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <label
                          key={value}
                          className="flex flex-col items-center gap-1 cursor-pointer flex-1"
                          title={LIKERT_LABELS[value]}
                        >
                          <input
                            type="radio"
                            name={`question-${question.id}`}
                            value={value}
                            checked={answers[question.id] === value}
                            onChange={() => {
                              setAnswers((prev) => ({ ...prev, [question.id]: value }));
                              setError(null);
                            }}
                            className="w-5 h-5 text-green-600 border-gray-300"
                          />
                          <span className="text-xs text-gray-500">{value}</span>
                        </label>
                      ))}
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[11px] text-gray-400">
                      <span>Discordo totalmente</span>
                      <span>Concordo totalmente</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-4 sticky bottom-0 bg-white pt-4 pb-2 border-t border-gray-100">
        <span className="text-xs text-gray-600">
          Respondidas: <strong>{answeredCount}</strong> de <strong>{total}</strong>
        </span>
        <button
          onClick={handleSubmit}
          disabled={!isComplete || submitting}
          className={`px-6 py-2 rounded-md font-medium transition-colors ${
            isComplete && !submitting
              ? "bg-green-700 text-white hover:bg-green-800"
              : "bg-gray-200 text-gray-500 cursor-not-allowed"
          }`}
        >
          {submitting ? "Enviando..." : "Enviar Avaliação"}
        </button>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitExitSurvey, type ExitSurveyAnswers } from "@/app/actions/submitExitSurvey";

type ExitSurveyPublicData = {
  department: string | null;
  admissionDate: string | null;
  exitDate: string;
};

const SCALE_QUESTIONS: { key: keyof Pick<ExitSurveyAnswers, "environmentScore" | "leaderRelationshipScore" | "growthScore" | "benefitsScore" | "communicationScore">; label: string }[] = [
  { key: "environmentScore", label: "Como você avalia o ambiente de trabalho?" },
  { key: "leaderRelationshipScore", label: "Como você avalia sua relação com o líder direto?" },
  { key: "growthScore", label: "Como você avalia as oportunidades de crescimento?" },
  { key: "benefitsScore", label: "Como você avalia os benefícios oferecidos?" },
  { key: "communicationScore", label: "Como você avalia a comunicação interna?" },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

const INITIAL_SCALE: Record<string, number | undefined> = {};

export function ExitSurveyForm({ data, token }: { data: ExitSurveyPublicData; token: string }) {
  const router = useRouter();
  const [leaderName, setLeaderName] = useState("");
  const [scores, setScores] = useState<Record<string, number | undefined>>(INITIAL_SCALE);
  const [biggestChallenge, setBiggestChallenge] = useState("");
  const [improvementSuggestion, setImprovementSuggestion] = useState("");
  const [wouldReturn, setWouldReturn] = useState<boolean | null>(null);
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [freeComment, setFreeComment] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);

    if (!leaderName.trim()) {
      setError("Informe o nome do seu líder direto.");
      return;
    }
    const missingScore = SCALE_QUESTIONS.find((q) => !scores[q.key]);
    if (missingScore) {
      setError("Responda todas as perguntas de avaliação (escala de 1 a 5).");
      return;
    }
    if (wouldReturn === null || wouldRecommend === null) {
      setError("Responda as duas perguntas de sim/não.");
      return;
    }

    setSubmitting(true);
    const result = await submitExitSurvey(token, {
      leaderName,
      environmentScore: scores.environmentScore!,
      leaderRelationshipScore: scores.leaderRelationshipScore!,
      growthScore: scores.growthScore!,
      benefitsScore: scores.benefitsScore!,
      communicationScore: scores.communicationScore!,
      biggestChallenge,
      improvementSuggestion,
      wouldReturn,
      wouldRecommend,
      freeComment,
      consentGiven,
    });

    if (!result.success) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    router.push(`/pesquisa-saida/${token}/sucesso`);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pesquisa de Desligamento</h1>
        <p className="text-sm text-gray-600 mt-2">
          Sua opinião nos ajuda a melhorar. As respostas são confidenciais.
        </p>
        <div className="mt-4 p-3 bg-gray-50 rounded-md text-sm text-gray-600 space-y-1">
          {data.department && <p>Setor: {data.department}</p>}
          {data.admissionDate && <p>Admissão: {formatDate(data.admissionDate)}</p>}
          <p>Data de saída: {formatDate(data.exitDate)}</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="p-4 border border-gray-200 rounded-lg">
        <label className="block text-sm font-medium text-gray-900 mb-2">Quem era seu líder direto?</label>
        <input
          type="text"
          value={leaderName}
          onChange={(e) => setLeaderName(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          placeholder="Nome do líder"
        />
      </div>

      <div className="space-y-4">
        {SCALE_QUESTIONS.map((question) => (
          <div key={question.key} className="p-4 border border-gray-200 rounded-lg">
            <p className="text-sm font-medium text-gray-900 mb-3">{question.label}</p>
            <div className="flex items-center gap-4">
              {[1, 2, 3, 4, 5].map((value) => (
                <label key={value} className="flex flex-col items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name={question.key}
                    checked={scores[question.key] === value}
                    onChange={() => setScores((prev) => ({ ...prev, [question.key]: value }))}
                    className="w-4 h-4"
                  />
                  <span className="text-xs text-gray-500">{value}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Ruim</span>
              <span>Ótimo</span>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border border-gray-200 rounded-lg">
        <label className="block text-sm font-medium text-gray-900 mb-2">Qual foi seu maior desafio na empresa?</label>
        <textarea
          value={biggestChallenge}
          onChange={(e) => setBiggestChallenge(e.target.value)}
          rows={3}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
      </div>

      <div className="p-4 border border-gray-200 rounded-lg">
        <label className="block text-sm font-medium text-gray-900 mb-2">O que a empresa poderia melhorar?</label>
        <textarea
          value={improvementSuggestion}
          onChange={(e) => setImprovementSuggestion(e.target.value)}
          rows={3}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
      </div>

      <div className="p-4 border border-gray-200 rounded-lg space-y-4">
        <div>
          <p className="text-sm font-medium text-gray-900 mb-2">Voltaria a trabalhar na empresa no futuro?</p>
          <div className="flex gap-4">
            {[
              { label: "Sim", value: true },
              { label: "Não", value: false },
            ].map((opt) => (
              <label key={String(opt.value)} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="wouldReturn"
                  checked={wouldReturn === opt.value}
                  onChange={() => setWouldReturn(opt.value)}
                />
                <span className="text-sm text-gray-700">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900 mb-2">Recomendaria a empresa para outras pessoas?</p>
          <div className="flex gap-4">
            {[
              { label: "Sim", value: true },
              { label: "Não", value: false },
            ].map((opt) => (
              <label key={String(opt.value)} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="wouldRecommend"
                  checked={wouldRecommend === opt.value}
                  onChange={() => setWouldRecommend(opt.value)}
                />
                <span className="text-sm text-gray-700">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 border border-gray-200 rounded-lg">
        <label className="block text-sm font-medium text-gray-900 mb-2">Comentário livre (opcional)</label>
        <textarea
          value={freeComment}
          onChange={(e) => setFreeComment(e.target.value)}
          rows={4}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          placeholder="Fique à vontade para comentar qualquer coisa sobre sua experiência."
        />
        <label className="flex items-start gap-2 mt-3 cursor-pointer">
          <input
            type="checkbox"
            checked={consentGiven}
            onChange={(e) => setConsentGiven(e.target.checked)}
            className="mt-1"
          />
          <span className="text-xs text-gray-500">
            Autorizo que o comentário acima seja analisado por inteligência artificial para
            identificar temas recorrentes, sem meu nome associado ao resultado. Isso é
            opcional — a pesquisa é enviada mesmo sem essa autorização.
          </span>
        </label>
      </div>

      <div className="flex justify-end sticky bottom-0 bg-white pt-4 pb-2 border-t border-gray-100">
        <button onClick={handleSubmit} disabled={submitting} className="fin-btn fin-btn--confirm">
          {submitting ? "Enviando..." : "Enviar pesquisa"}
        </button>
      </div>
    </div>
  );
}

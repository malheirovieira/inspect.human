import { CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { COMPETENCIA_DIMENSIONS, DISC_DIMENSIONS, DISC_DIMENSION_LABELS } from "@/lib/disc/questions";
import type { DiscResponse } from "@prisma/client";

function competenciaScores(r: DiscResponse): Record<(typeof COMPETENCIA_DIMENSIONS)[number], number> {
  return {
    Energia: Number(r.scoreEnergia ?? 0),
    Responsabilidade: Number(r.scoreResponsabilidade ?? 0),
    Engajamento: Number(r.scoreEngajamento ?? 0),
    "Trabalho em Equipe": Number(r.scoreTrabalhoEquipe ?? 0),
    Comprometimento: Number(r.scoreComprometimento ?? 0),
    "Facilidade de Aprendizagem": Number(r.scoreAprendizagem ?? 0),
  };
}

function discScores(r: DiscResponse): Record<(typeof DISC_DIMENSIONS)[number], number> {
  return {
    D: Number(r.scoreD ?? 0),
    I: Number(r.scoreI ?? 0),
    S: Number(r.scoreS ?? 0),
    C: Number(r.scoreC ?? 0),
  };
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-gray-700">{label}</span>
        <span className="font-semibold text-gray-900">{score.toFixed(1)}/100</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-green-600 rounded-full" style={{ width: `${Math.min(score, 100)}%` }} />
      </div>
    </div>
  );
}

export default async function SucessoPage({ params }: { params: { token: string } }) {
  const response = await prisma.discResponse.findUnique({ where: { token: params.token } });

  const submitted = response?.submittedAt != null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center px-4 py-8">
      <div className="max-w-lg w-full">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-center mb-6">
            <CheckCircle2 className="w-16 h-16 text-green-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">Avaliação Concluída!</h1>

          {!submitted && (
            <p className="text-gray-600 mb-6 text-center">Sua avaliação foi enviada com sucesso.</p>
          )}

          {submitted && response && (
            <div className="space-y-6 mt-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <p className="text-xs text-green-700 uppercase font-semibold tracking-wide">Índice Geral</p>
                <p className="text-3xl font-bold text-green-800 mt-1">
                  {Number(response.scoreGeral).toFixed(0)}/100
                </p>
                <p className="text-sm text-green-700">{response.nivelGeral}</p>
              </div>

              <div>
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Competências</h2>
                <div className="space-y-3">
                  {COMPETENCIA_DIMENSIONS.map((dim) => (
                    <ScoreBar key={dim} label={dim} score={competenciaScores(response)[dim]} />
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
                  Perfil DISC: <span className="text-green-700">{response.perfilDisc}</span>
                </h2>
                <div className="space-y-3">
                  {DISC_DIMENSIONS.map((dim) => (
                    <ScoreBar key={dim} label={DISC_DIMENSION_LABELS[dim]} score={discScores(response)[dim]} />
                  ))}
                </div>
              </div>
            </div>
          )}

          <p className="text-sm text-gray-500 mt-6 text-center">
            O recrutador receberá seus resultados e entrará em contato em breve.
          </p>
          <p className="text-xs text-gray-400 mt-2 text-center">Você pode fechar esta janela.</p>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useSearchParams } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';

export default function SucessoPage() {
  const searchParams = useSearchParams();
  const score = searchParams.get('score');

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-center mb-6">
            <CheckCircle2 className="w-16 h-16 text-green-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Sucesso!
          </h1>

          <p className="text-gray-600 mb-6">
            Sua avaliação foi enviada com sucesso.
          </p>

          {score && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-green-700">
                <span className="font-semibold">Pontuação:</span> {score} pontos
              </p>
            </div>
          )}

          <p className="text-sm text-gray-500 mb-6">
            O recrutador receberá seus resultados e entrará em contato em breve.
          </p>

          <p className="text-xs text-gray-400">
            Você pode fechar esta janela.
          </p>
        </div>
      </div>
    </div>
  );
}

import { Suspense } from 'react';
import { AssessmentForm } from '@/app/components/assessments/AssessmentForm';
import { AssessmentPublicData } from '@/lib/types/assessments';

interface PageProps {
  params: { token: string };
}

async function loadAssessment(token: string): Promise<AssessmentPublicData | null> {
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

  const res = await fetch(`${baseUrl}/api/avaliacao/${token}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    return null;
  }

  return res.json();
}

export default async function AvaliacaoPage({ params }: PageProps) {
  const assessment = await loadAssessment(params.token);

  if (!assessment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              Link Inválido
            </h1>
            <p className="text-gray-600 mb-4">
              O link de avaliação não foi encontrado, expirou ou já foi respondido.
            </p>
            <p className="text-sm text-gray-500">
              Se acredita que é um erro, entre em contato com o recrutador.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow p-8">
          <Suspense
            fallback={
              <div className="text-center text-gray-500">
                Carregando questionário...
              </div>
            }
          >
            <AssessmentForm
              assessment={assessment}
              token={params.token}
              onSuccess={(score) => {
                // Redireciona pra página de confirmação
                window.location.href = `/avaliacao/${params.token}/sucesso?score=${score}`;
              }}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

export const metadata = {
  title: 'Avaliação - Inspect Talent',
  description: 'Responda seu questionário de avaliação',
};

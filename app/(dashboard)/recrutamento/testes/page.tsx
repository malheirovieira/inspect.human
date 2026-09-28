import Link from 'next/link';
import { getAssessments } from '@/lib/actions/assessments';
import { Plus } from 'lucide-react';
import { DeleteAssessmentButton } from './components/DeleteAssessmentButton';

export default async function TestesPage() {
  const result = await getAssessments();

  if (!result.success) {
    return (
      <div className="min-h-screen bg-gray-50 py-6 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {result.error}
          </div>
        </div>
      </div>
    );
  }

  const assessments = result.data || [];

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="px-6 max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="mb-8 flex items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">
              Testes e Avaliações
            </h1>
            <p className="text-base text-gray-600 mt-1">
              Gerencie os testes de conhecimento e avaliações técnicas para suas vagas
            </p>
          </div>

          {/* BOTÃO NOVO TESTE */}
          <Link
            href="/recrutamento/testes/novo"
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 transition-colors font-medium whitespace-nowrap"
          >
            <Plus size={18} />
            Novo Teste
          </Link>
        </div>

        {/* GRID DE CARDS */}
        {assessments.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
            <p className="text-gray-600 font-medium mb-2">Nenhum teste criado ainda</p>
            <p className="text-gray-500 text-sm mb-6">
              Crie seu primeiro teste de avaliação para começar
            </p>
            <Link
              href="/recrutamento/testes/novo"
              className="inline-block px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 transition-colors text-sm font-medium"
            >
              Criar Primeiro Teste
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assessments.map((assessment) => (
              <div
                key={assessment.id}
                className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col min-h-64"
              >
                {/* CONTEÚDO */}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {assessment.title}
                  </h3>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                    {assessment.description || 'Sem descrição'}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>📋 {assessment.questions.length} pergunta{assessment.questions.length !== 1 ? 's' : ''}</span>
                    <span>⭐ {assessment.totalScore} pts</span>
                  </div>
                </div>

                {/* AÇÕES */}
                <div className="grid grid-cols-2 gap-2 mt-6 pt-4 border-t border-gray-100">
                  <Link
                    href={`/recrutamento/testes/${assessment.id}/editar`}
                    className="px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-center font-medium"
                  >
                    Editar
                  </Link>
                  <DeleteAssessmentButton
                    id={assessment.id}
                    hasResponses={assessment.responses.length > 0}
                    title={assessment.title}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export const metadata = {
  title: 'Testes e Avaliações - Inspect Talent',
};

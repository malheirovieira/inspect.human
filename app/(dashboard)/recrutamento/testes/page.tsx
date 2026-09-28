import Link from 'next/link';
import { getAssessments } from '@/lib/actions/assessments';
import { FileText, Plus, Trash2 } from 'lucide-react';
import { DeleteAssessmentButton } from './components/DeleteAssessmentButton';

export default async function TestesPage() {
  const result = await getAssessments();

  if (!result.success) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {result.error}
        </div>
      </div>
    );
  }

  const assessments = result.data || [];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Testes e Avaliações</h1>
          <p className="text-gray-600 mt-1">Crie e gerencie testes para candidatos</p>
        </div>
        <Link
          href="/recrutamento/testes/novo"
          className="inline-flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition-colors font-medium"
        >
          <Plus size={20} />
          Novo Teste
        </Link>
      </div>

      {/* Lista de testes */}
      {assessments.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <FileText size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 font-medium mb-2">Nenhum teste criado ainda</p>
          <p className="text-gray-500 text-sm mb-4">
            Crie seu primeiro teste de avaliação para começar
          </p>
          <Link
            href="/recrutamento/testes/novo"
            className="inline-block px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition-colors text-sm font-medium"
          >
            Criar Primeiro Teste
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {assessments.map((assessment) => (
            <div
              key={assessment.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-lg">
                    {assessment.title}
                  </h3>
                  {assessment.description && (
                    <p className="text-gray-600 text-sm mt-1">{assessment.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                    <span>
                      <strong>{assessment.questions.length}</strong> pergunta{assessment.questions.length !== 1 ? 's' : ''}
                    </span>
                    <span>
                      <strong>{assessment.totalScore}</strong> ponto{assessment.totalScore !== 1 ? 's' : ''}
                    </span>
                    <span>
                      <strong>{assessment.responses.length}</strong> resposta{assessment.responses.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/recrutamento/testes/${assessment.id}/editar`}
                    className="px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const metadata = {
  title: 'Testes e Avaliações - Inspect Talent',
};

import { getAssessmentById } from '@/lib/actions/assessments';
import { AssessmentForm } from '../../components/AssessmentForm';

interface PageProps {
  params: { id: string };
}

export default async function EditarTestePage({ params }: PageProps) {
  const result = await getAssessmentById(params.id);

  if (!result.success) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-3xl font-bold text-gray-900">Editar Teste</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {result.error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Editar Teste</h1>
        <p className="text-gray-600 mt-1">{result.data?.title}</p>
      </div>

      <AssessmentForm initialData={result.data!} />
    </div>
  );
}

export const metadata = {
  title: 'Editar Teste - Inspect Talent',
};

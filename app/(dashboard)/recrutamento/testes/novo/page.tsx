import { AssessmentForm } from '../components/AssessmentForm';

export default function NovoTestePage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Novo Teste</h1>
        <p className="text-gray-600 mt-1">Crie um teste com múltiplas escolhas</p>
      </div>

      <AssessmentForm />
    </div>
  );
}

export const metadata = {
  title: 'Novo Teste - Inspect Talent',
};

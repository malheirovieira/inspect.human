'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createAssessment, updateAssessment, CreateAssessmentInput } from '@/lib/actions/assessments';
import { Prisma } from '@prisma/client';
import { Plus, Trash2, Check, X } from 'lucide-react';

type AssessmentWithRelations = Prisma.AssessmentGetPayload<{
  include: { questions: { include: { choices: true } } };
}>;

interface AssessmentFormProps {
  initialData?: AssessmentWithRelations;
}

interface Choice {
  text: string;
  isCorrect: boolean;
}

interface Question {
  text: string;
  maxScore: number;
  choices: Choice[];
}

export function AssessmentForm({ initialData }: AssessmentFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [questions, setQuestions] = useState<Question[]>(
    initialData?.questions.map((q) => ({
      text: q.text,
      maxScore: q.maxScore,
      choices: q.choices.map((c) => ({
        text: c.text,
        isCorrect: c.isCorrect,
      })),
    })) || []
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalScore = questions.reduce((sum, q) => sum + q.maxScore, 0);

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        text: '',
        maxScore: 1,
        choices: [
          { text: '', isCorrect: true },
          { text: '', isCorrect: false },
        ],
      },
    ]);
  };

  const removeQuestion = (idx: number) => {
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const updateQuestion = (idx: number, field: keyof Question, value: any) => {
    const newQuestions = [...questions];
    newQuestions[idx] = { ...newQuestions[idx], [field]: value };
    setQuestions(newQuestions);
  };

  const updateChoice = (qIdx: number, cIdx: number, field: keyof Choice, value: any) => {
    const newQuestions = [...questions];
    newQuestions[qIdx].choices[cIdx] = {
      ...newQuestions[qIdx].choices[cIdx],
      [field]: value,
    };
    setQuestions(newQuestions);
  };

  const addChoice = (qIdx: number) => {
    const newQuestions = [...questions];
    newQuestions[qIdx].choices.push({ text: '', isCorrect: false });
    setQuestions(newQuestions);
  };

  const removeChoice = (qIdx: number, cIdx: number) => {
    const newQuestions = [...questions];
    newQuestions[qIdx].choices = newQuestions[qIdx].choices.filter((_, i) => i !== cIdx);
    setQuestions(newQuestions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const input: CreateAssessmentInput = {
        title,
        description: description || undefined,
        questions,
      };

      const result = initialData
        ? await updateAssessment(initialData.id, input)
        : await createAssessment(input);

      if (!result.success) {
        setError(result.error || 'Erro desconhecido');
        return;
      }

      router.push('/recrutamento/testes');
      router.refresh();
    } catch (err) {
      setError('Erro ao salvar teste');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Dados básicos */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Título do Teste *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="ex: Teste Operador"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Descrição (opcional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="ex: Avaliação de conhecimentos operacionais"
            rows={3}
          />
        </div>

        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            <strong>Pontuação total:</strong> {totalScore} ponto{totalScore !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Perguntas */}
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        )}

        {questions.map((question, qIdx) => (
          <div key={qIdx} className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Pergunta {qIdx + 1}
              </h3>
              <button
                type="button"
                onClick={() => removeQuestion(qIdx)}
                className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Texto da Pergunta *
              </label>
              <input
                type="text"
                value={question.text}
                onChange={(e) => updateQuestion(qIdx, 'text', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="ex: Qual é a prioridade?"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Pontuação Máxima *
              </label>
              <input
                type="number"
                min="1"
                value={question.maxScore}
                onChange={(e) => updateQuestion(qIdx, 'maxScore', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Opções */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-900">
                Opções de Resposta *
              </label>

              {question.choices.map((choice, cIdx) => (
                <div key={cIdx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={choice.text}
                      onChange={(e) => updateChoice(qIdx, cIdx, 'text', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="ex: Opção A"
                      required
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={choice.isCorrect}
                      onChange={(e) =>
                        updateChoice(qIdx, cIdx, 'isCorrect', e.target.checked)
                      }
                      className="w-4 h-4 accent-green-600"
                    />
                    <span className="text-sm text-gray-700">Correta</span>
                  </label>

                  {question.choices.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeChoice(qIdx, cIdx)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={() => addChoice(qIdx)}
                className="w-full px-3 py-2 text-sm text-gray-700 border border-dashed border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                Adicionar Opção
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Botões */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={addQuestion}
          className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center gap-2"
        >
          <Plus size={18} />
          Adicionar Pergunta
        </button>

        <div className="flex-1" />

        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
        >
          Cancelar
        </button>

        <button
          type="submit"
          disabled={isSubmitting || questions.length === 0 || !title}
          className="px-6 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
        >
          {isSubmitting ? 'Salvando...' : 'Salvar Teste'}
        </button>
      </div>
    </form>
  );
}

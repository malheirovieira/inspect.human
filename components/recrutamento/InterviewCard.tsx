'use client';

import { useState } from 'react';
import { Interview } from '@prisma/client';
import { cancelInterview } from '@/app/actions/scheduleInterview';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, FileText, Trash2, Users, MapPin, User } from 'lucide-react';

interface InterviewCardProps {
  interview: Interview;
  applicationId: string;
  onSchedule: () => void;
}

export function InterviewCard({
  interview,
  applicationId,
  onSchedule,
}: InterviewCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleCancel = async () => {
    if (!confirm('Deseja cancelar essa entrevista?')) return;

    setLoading(true);
    const result = await cancelInterview(applicationId);

    if (!result.success) {
      alert(result.error || 'Erro ao cancelar');
      setLoading(false);
      return;
    }

    router.refresh();
  };

  const formatted = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(interview.scheduledAt));

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Entrevista Agendada
        </h3>
        <span className="px-3 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full">
          {interview.status === 'SCHEDULED' && 'Agendada'}
          {interview.status === 'COMPLETED' && 'Concluída'}
          {interview.status === 'CANCELLED' && 'Cancelada'}
        </span>
      </div>

      <div className="mb-6 space-y-3">
        <div className="flex items-center gap-3 text-sm">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span className="text-gray-900 font-medium">{formatted}</span>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <MapPin className="w-4 h-4 text-gray-400" />
          <span className="text-gray-900">
            {interview.modality === 'REMOTO' ? 'Remoto' : 'Presencial'}
          </span>
        </div>

        {interview.interviewerName && (
          <div className="flex items-center gap-3 text-sm">
            <User className="w-4 h-4 text-gray-400" />
            <span className="text-gray-900">{interview.interviewerName}</span>
          </div>
        )}

        {interview.guests && (
          <div className="flex items-start gap-3 text-sm">
            <Users className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
            <span className="text-gray-900">{interview.guests}</span>
          </div>
        )}

        {interview.notes && (
          <div className="flex gap-3 p-3 bg-gray-50 rounded-lg">
            <FileText className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700">{interview.notes}</p>
          </div>
        )}
      </div>

      {interview.status === 'SCHEDULED' && (
        <div className="flex gap-2 pt-4 border-t border-gray-100">
          <button
            onClick={onSchedule}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            disabled={loading}
          >
            Reagendar
          </button>
          <button
            onClick={handleCancel}
            className="flex-1 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            disabled={loading}
          >
            <Trash2 size={16} />
            {loading ? 'Cancelando...' : 'Cancelar'}
          </button>
        </div>
      )}
    </div>
  );
}

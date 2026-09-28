'use client';

import { useState } from 'react';
import { Interview } from '@prisma/client';
import { InterviewCard } from './InterviewCard';
import { ScheduleInterviewModal } from './ScheduleInterviewModal';
import { Calendar } from 'lucide-react';

interface InterviewSectionProps {
  applicationId: string;
  candidateName: string;
  interviews?: Interview[];
}

export function InterviewSection({
  applicationId,
  candidateName,
  interviews = [],
}: InterviewSectionProps) {
  const [showModal, setShowModal] = useState(false);
  const interview = interviews[0];

  return (
    <>
      {interview ? (
        <InterviewCard
          interview={interview}
          applicationId={applicationId}
          onSchedule={() => setShowModal(true)}
        />
      ) : (
        <button
          onClick={() => setShowModal(true)}
          className="w-full p-6 border-2 border-dashed border-gray-300 rounded-lg text-center hover:border-gray-400 hover:bg-gray-50 transition-colors"
        >
          <Calendar className="w-6 h-6 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600 font-medium">Agendar Entrevista</p>
        </button>
      )}

      {showModal && (
        <ScheduleInterviewModal
          applicationId={applicationId}
          candidateName={candidateName}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

'use client';

import { useState } from 'react';
import { Interview } from '@prisma/client';
import { Calendar } from 'lucide-react';
import { ScheduleInterviewModal } from './ScheduleInterviewModal';

interface ScheduleInterviewButtonProps {
  applicationId: string;
  candidateName: string;
  interviews?: Interview[];
}

export function ScheduleInterviewButton({
  applicationId,
  candidateName,
  interviews = [],
}: ScheduleInterviewButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const hasInterview = interviews.length > 0;

  if (hasInterview) return null;

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        style={{
          width: '100%',
          padding: '1.5rem',
          border: '2px dashed var(--border)',
          borderRadius: 'var(--radius-md)',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s',
          background: 'transparent',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--text-muted)';
          e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border)';
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <Calendar style={{ width: 24, height: 24, color: 'var(--text-muted)', marginLeft: 'auto', marginRight: 'auto', marginBottom: 8 }} />
        <p style={{ fontWeight: 500, color: 'var(--text-muted)' }}>Agendar Entrevista</p>
      </button>

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

'use client';

import { useState } from 'react';
import { generateAssessmentLink } from '@/lib/actions/generateAssessmentLink';
import { Copy, FileCheck } from 'lucide-react';

interface AssessmentLinkButtonProps {
  applicationId: string;
  jobHasAssessment: boolean;
}

export function AssessmentLinkButton({
  applicationId,
  jobHasAssessment,
}: AssessmentLinkButtonProps) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerateLink = async () => {
    setIsLoading(true);
    try {
      const result = await generateAssessmentLink(applicationId);

      if (!result.success) {
        alert(result.error || 'Erro ao gerar link');
        return;
      }

      if (result.token) {
        setToken(result.token);
      }
    } catch (err) {
      alert('Erro ao gerar link de avaliação');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!token) return;

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const link = `${baseUrl}/avaliacao/${token}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!jobHasAssessment) {
    return (
      <div className="text-xs text-gray-500">
        Vaga sem teste vinculado
      </div>
    );
  }

  if (!token) {
    return (
      <button
        onClick={handleGenerateLink}
        disabled={isLoading}
        className="flex items-center gap-2 px-3 py-2 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 disabled:opacity-50 transition-colors"
      >
        <FileCheck size={14} />
        {isLoading ? 'Gerando...' : 'Gerar link'}
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-xs font-mono bg-gray-100 p-2 rounded break-all">
        /avaliacao/{token}
      </div>
      <button
        onClick={handleCopyLink}
        className={`flex items-center gap-2 px-3 py-2 text-xs rounded transition-colors ${
          copied
            ? 'bg-green-100 text-green-700'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        <Copy size={14} />
        {copied ? 'Copiado!' : 'Copiar URL'}
      </button>
    </div>
  );
}

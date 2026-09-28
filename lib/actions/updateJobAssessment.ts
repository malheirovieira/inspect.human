'use server';

import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function updateJobAssessment(
  jobId: string,
  assessmentId: string | null
) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'Não autenticado' };
    }

    // Verifica que a vaga pertence à empresa do usuário
    const job = await prisma.job.findFirst({
      where: { id: jobId, companyId: session.companyId },
    });

    if (!job) {
      return { success: false, error: 'Vaga não encontrada' };
    }

    // Se assessmentId foi fornecido, verifica que o assessment pertence à empresa
    if (assessmentId) {
      const assessment = await prisma.assessment.findFirst({
        where: { id: assessmentId, companyId: session.companyId },
      });

      if (!assessment) {
        return { success: false, error: 'Teste não encontrado' };
      }
    }

    // Atualiza
    await prisma.job.update({
      where: { id: jobId },
      data: { assessmentId },
    });

    return { success: true };
  } catch (err) {
    console.error('[updateJobAssessment]', err);
    return { success: false, error: 'Erro ao atualizar vaga' };
  }
}

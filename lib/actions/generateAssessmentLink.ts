'use server';

import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

function generateToken(): string {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}

export async function generateAssessmentLink(applicationId: string) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'Não autenticado' };
    }

    // Busca candidatura + vaga
    const application = await prisma.application.findFirst({
      where: {
        id: applicationId,
        companyId: session.companyId,
      },
      include: {
        job: {
          select: {
            assessmentId: true,
          },
        },
      },
    });

    if (!application) {
      return { success: false, error: 'Candidatura não encontrada' };
    }

    if (!application.job.assessmentId) {
      return { success: false, error: 'Esta vaga não tem teste vinculado' };
    }

    // Verifica se já tem response ativa
    const existingResponse = await prisma.assessmentResponse.findFirst({
      where: {
        applicationId,
        submittedAt: null,
      },
    });

    if (existingResponse) {
      // Já existe link ativo, retorna o token existente
      return {
        success: true,
        token: existingResponse.token,
      };
    }

    // Cria novo response com token
    const response = await prisma.assessmentResponse.create({
      data: {
        companyId: session.companyId,
        applicationId,
        assessmentId: application.job.assessmentId,
        token: generateToken(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias
      },
    });

    return {
      success: true,
      token: response.token,
    };
  } catch (err) {
    console.error('[generateAssessmentLink]', err);
    return { success: false, error: 'Erro ao gerar link' };
  }
}

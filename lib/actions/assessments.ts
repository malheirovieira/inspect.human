'use server';

import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { z } from 'zod';

const CreateAssessmentSchema = z.object({
  title: z.string().min(3, 'Título deve ter no mínimo 3 caracteres'),
  description: z.string().optional(),
  questions: z.array(
    z.object({
      text: z.string().min(5, 'Pergunta deve ter no mínimo 5 caracteres'),
      maxScore: z.number().int().positive('Pontuação deve ser positiva'),
      choices: z.array(
        z.object({
          text: z.string().min(1, 'Opção não pode ser vazia'),
          isCorrect: z.boolean(),
        })
      ).min(2, 'Pergunta deve ter pelo menos 2 opções'),
    })
  ).min(1, 'Teste deve ter pelo menos 1 pergunta'),
});

export type CreateAssessmentInput = z.infer<typeof CreateAssessmentSchema>;

export async function createAssessment(input: CreateAssessmentInput) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'Não autenticado' };
    }

    const validation = CreateAssessmentSchema.parse(input);

    // Calcula score total
    const totalScore = validation.questions.reduce((sum, q) => sum + q.maxScore, 0);

    // Cria assessment em transação
    const assessment = await prisma.assessment.create({
      data: {
        companyId: session.companyId,
        title: validation.title,
        description: validation.description,
        totalScore,
        questions: {
          create: validation.questions.map((q, qIdx) => ({
            companyId: session.companyId,
            text: q.text,
            type: 'MULTIPLE_CHOICE',
            maxScore: q.maxScore,
            position: qIdx,
            choices: {
              create: q.choices.map((c, cIdx) => ({
                companyId: session.companyId,
                text: c.text,
                isCorrect: c.isCorrect,
                position: cIdx,
              })),
            },
          })),
        },
      },
      include: {
        questions: {
          include: {
            choices: true,
          },
        },
      },
    });

    return { success: true, data: assessment };
  } catch (err) {
    if (err instanceof z.ZodError) {
      const firstError = err.issues[0];
      return { success: false, error: firstError?.message || 'Erro de validação' };
    }
    console.error('[createAssessment]', err);
    return { success: false, error: 'Erro ao criar teste' };
  }
}

export async function getAssessments() {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'Não autenticado', data: null };
    }

    const assessments = await prisma.assessment.findMany({
      where: { companyId: session.companyId },
      include: {
        questions: {
          select: { id: true },
        },
        responses: {
          where: { submittedAt: { not: null } },
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: assessments };
  } catch (err) {
    console.error('[getAssessments]', err);
    return { success: false, error: 'Erro ao buscar testes', data: null };
  }
}

export async function getAssessmentById(id: string) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'Não autenticado', data: null };
    }

    const assessment = await prisma.assessment.findFirst({
      where: {
        id,
        companyId: session.companyId,
      },
      include: {
        questions: {
          include: {
            choices: true,
          },
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!assessment) {
      return { success: false, error: 'Teste não encontrado', data: null };
    }

    return { success: true, data: assessment };
  } catch (err) {
    console.error('[getAssessmentById]', err);
    return { success: false, error: 'Erro ao buscar teste', data: null };
  }
}

export async function updateAssessment(id: string, input: CreateAssessmentInput) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'Não autenticado' };
    }

    const validation = CreateAssessmentSchema.parse(input);
    const totalScore = validation.questions.reduce((sum, q) => sum + q.maxScore, 0);

    // Verifica se há responses — se houver, só permite atualizar descrição
    const existingResponses = await prisma.assessmentResponse.findFirst({
      where: { assessmentId: id },
    });

    if (existingResponses) {
      return {
        success: false,
        error: 'Não é possível editar um teste que já tem respostas. Crie um novo teste.',
      };
    }

    // Delete questions e choices antigos
    await prisma.assessmentQuestion.deleteMany({ where: { assessmentId: id } });

    // Update assessment
    const assessment = await prisma.assessment.update({
      where: { id },
      data: {
        title: validation.title,
        description: validation.description,
        totalScore,
        questions: {
          create: validation.questions.map((q, qIdx) => ({
            companyId: session.companyId,
            text: q.text,
            type: 'MULTIPLE_CHOICE',
            maxScore: q.maxScore,
            position: qIdx,
            choices: {
              create: q.choices.map((c, cIdx) => ({
                companyId: session.companyId,
                text: c.text,
                isCorrect: c.isCorrect,
                position: cIdx,
              })),
            },
          })),
        },
      },
      include: {
        questions: {
          include: {
            choices: true,
          },
        },
      },
    });

    return { success: true, data: assessment };
  } catch (err) {
    if (err instanceof z.ZodError) {
      const firstError = err.issues[0];
      return { success: false, error: firstError?.message || 'Erro de validação' };
    }
    console.error('[updateAssessment]', err);
    return { success: false, error: 'Erro ao atualizar teste' };
  }
}

export async function deleteAssessment(id: string) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'Não autenticado' };
    }

    // Verifica se há responses
    const existingResponses = await prisma.assessmentResponse.findFirst({
      where: { assessmentId: id },
    });

    if (existingResponses) {
      return {
        success: false,
        error: 'Não é possível deletar um teste que já tem respostas.',
      };
    }

    await prisma.assessment.delete({
      where: { id },
    });

    return { success: true };
  } catch (err) {
    console.error('[deleteAssessment]', err);
    return { success: false, error: 'Erro ao deletar teste' };
  }
}

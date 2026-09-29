'use server';

import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { enqueueEmail } from '@/lib/email';

export async function scheduleInterview(
  applicationId: string,
  scheduledAt: Date,
  notes?: string,
  modality?: string,
  interviewerName?: string,
  guests?: string,
  interviewLink?: string
) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'Não autenticado' };
    }

    if (scheduledAt < new Date()) {
      return { success: false, error: 'Data deve ser no futuro' };
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        candidate: true,
        job: { include: { company: true } },
      },
    });

    if (!application) {
      return { success: false, error: 'Candidatura não encontrada' };
    }

    if (application.job.companyId !== session.companyId) {
      return { success: false, error: 'Sem permissão' };
    }

    const interview = await prisma.interview.upsert({
      where: { applicationId },
      update: {
        scheduledAt,
        scheduledBy: session.userId,
        notes,
        modality: modality || 'PRESENCIAL',
        interviewerName,
        guests,
        interviewLink: interviewLink || undefined,
      },
      create: {
        applicationId,
        scheduledAt,
        scheduledBy: session.userId,
        notes,
        modality: modality || 'PRESENCIAL',
        interviewerName,
        guests,
        interviewLink,
      },
    });

    // Busca template "Convite Entrevista"
    const template = await prisma.emailTemplate.findFirst({
      where: {
        companyId: application.job.companyId,
        name: 'Convite Entrevista',
      },
    });

    if (template) {
      const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });

      const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });

      try {
        await enqueueEmail(
          applicationId,
          template.id,
          {
            candidateName: application.candidate.name,
            interviewDate: dateFormatter.format(scheduledAt),
            interviewTime: timeFormatter.format(scheduledAt),
            candidateEmail: application.candidate.email,
          },
          application.candidate.email
        );
      } catch (err) {
        console.error('[scheduleInterview] Email enqueue failed:', err);
        // Continua mesmo se e-mail falhar
      }
    }

    // Cria evento de auditoria
    await prisma.applicationEvent.create({
      data: {
        companyId: application.job.companyId,
        applicationId,
        type: 'INTERVIEW_SCHEDULED',
        payload: {
          scheduledAt: scheduledAt.toISOString(),
        },
      },
    });

    return { success: true, data: interview };
  } catch (err) {
    console.error('[scheduleInterview]', err);
    return { success: false, error: 'Erro ao agendar entrevista' };
  }
}

// Disparado à parte do agendamento — o link (Meet/Teams/Zoom/endereço) só
// costuma existir depois de marcar data/hora, então merece seu próprio
// e-mail ("Link Entrevista") em vez de esperar o candidato adivinhar.
export async function sendInterviewLink(applicationId: string, interviewLink: string) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'Não autenticado' };
    }

    const trimmedLink = interviewLink.trim();
    if (!trimmedLink) {
      return { success: false, error: 'Informe o link da entrevista.' };
    }

    const interview = await prisma.interview.findUnique({
      where: { applicationId },
      include: {
        application: {
          include: { candidate: true, job: { include: { company: true } } },
        },
      },
    });

    if (!interview) {
      return { success: false, error: 'Entrevista não encontrada' };
    }

    if (interview.application.job.companyId !== session.companyId) {
      return { success: false, error: 'Sem permissão' };
    }

    const updated = await prisma.interview.update({
      where: { id: interview.id },
      data: { interviewLink: trimmedLink },
    });

    const template = await prisma.emailTemplate.findFirst({
      where: { companyId: interview.application.job.companyId, name: 'Link Entrevista' },
    });

    if (template) {
      const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
      const timeFormatter = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

      try {
        await enqueueEmail(
          applicationId,
          template.id,
          {
            candidateName: interview.application.candidate.name,
            interviewDate: dateFormatter.format(interview.scheduledAt),
            interviewTime: timeFormatter.format(interview.scheduledAt),
            interviewLink: trimmedLink,
            candidateEmail: interview.application.candidate.email,
          },
          interview.application.candidate.email
        );
      } catch (err) {
        console.error('[sendInterviewLink] Email enqueue failed:', err);
        // Link já foi salvo — não desfaz por causa do e-mail.
      }
    }

    await prisma.applicationEvent.create({
      data: {
        companyId: interview.application.job.companyId,
        applicationId,
        type: 'INTERVIEW_LINK_SENT',
        payload: { link: trimmedLink },
        actorId: session.userId,
      },
    });

    return { success: true, data: updated };
  } catch (err) {
    console.error('[sendInterviewLink]', err);
    return { success: false, error: 'Erro ao enviar link da entrevista' };
  }
}

export async function cancelInterview(applicationId: string) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'Não autenticado' };
    }

    const interview = await prisma.interview.findUnique({
      where: { applicationId },
      include: { application: { include: { job: true } } },
    });

    if (!interview) {
      return { success: false, error: 'Entrevista não encontrada' };
    }

    if (interview.application.job.companyId !== session.companyId) {
      return { success: false, error: 'Sem permissão' };
    }

    await prisma.interview.update({
      where: { id: interview.id },
      data: { status: 'CANCELLED' },
    });

    await prisma.applicationEvent.create({
      data: {
        companyId: interview.application.job.companyId,
        applicationId,
        type: 'INTERVIEW_CANCELLED',
        payload: {
          cancelledAt: new Date().toISOString(),
        },
      },
    });

    return { success: true };
  } catch (err) {
    console.error('[cancelInterview]', err);
    return { success: false, error: 'Erro ao cancelar entrevista' };
  }
}

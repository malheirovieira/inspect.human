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

    // Busca template "Convite Entrevista" — a entrevista já foi salva acima
    // independente do e-mail (perder o agendamento inteiro por falta de
    // template seria pior); mas a falta dele nunca deve passar batido, por
    // isso o aviso abaixo (emailWarning) em vez de um `if` mudo sem `else`.
    const template = await prisma.emailTemplate.findFirst({
      where: {
        companyId: application.job.companyId,
        name: 'Convite Entrevista',
      },
    });

    let emailWarning: string | undefined;

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
        emailWarning = 'Entrevista agendada, mas houve um erro ao enfileirar o e-mail de convite.';
      }
    } else {
      emailWarning = 'Entrevista agendada, mas nenhum modelo de e-mail "Convite Entrevista" está configurado para esta empresa — o candidato não foi avisado por e-mail.';
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

    return { success: true, data: interview, emailWarning };
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

    let emailWarning: string | undefined;

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
        emailWarning = 'Link salvo, mas houve um erro ao enfileirar o e-mail.';
      }
    } else {
      emailWarning = 'Link salvo, mas nenhum modelo de e-mail "Link Entrevista" está configurado para esta empresa — o candidato não foi avisado por e-mail.';
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

    return { success: true, data: updated, emailWarning };
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

// Remove o registro por completo — só faz sentido numa entrevista já
// CANCELLED (limpar o card em vez de deixar o cancelamento pendurado).
// Reagendar depois disso cria um Interview novo (upsert de scheduleInterview
// não encontra mais o registro antigo pra atualizar).
export async function deleteInterview(applicationId: string) {
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

    if (interview.status !== 'CANCELLED') {
      return { success: false, error: 'Só é possível excluir uma entrevista cancelada' };
    }

    await prisma.interview.delete({ where: { id: interview.id } });

    await prisma.applicationEvent.create({
      data: {
        companyId: interview.application.job.companyId,
        applicationId,
        type: 'INTERVIEW_DELETED',
        payload: { deletedAt: new Date().toISOString() },
        actorId: session.userId,
      },
    });

    return { success: true };
  } catch (err) {
    console.error('[deleteInterview]', err);
    return { success: false, error: 'Erro ao excluir entrevista' };
  }
}

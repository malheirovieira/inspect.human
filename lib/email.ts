import { prisma } from '@/lib/prisma';
import { enqueue } from '@/lib/tasks';
import { EMAIL_SEND_TASK } from '@/lib/tasks/handlers/emailSend';

// Renderiza variáveis do template: {{candidateName}} → value
export function renderTemplate(template: string, variables: Record<string, string>): string {
  let result = template;
  Object.entries(variables).forEach(([key, value]) => {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  });
  return result;
}

// Enfileira um e-mail para envio via background task
export async function enqueueEmail(
  applicationId: string,
  templateId: string,
  variables: Record<string, string>,
  recipientEmail: string
) {
  try {
    // Busca template
    const template = await prisma.emailTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new Error(`Template ${templateId} não encontrado`);
    }

    // Renderiza corpo
    const renderedBody = renderTemplate(template.bodyHtml, variables);
    const renderedSubject = renderTemplate(template.subject, variables);

    // Cria log do e-mail
    const emailLog = await prisma.emailLog.create({
      data: {
        applicationId,
        templateId,
        recipientEmail,
        subject: renderedSubject,
        bodyHtml: renderedBody,
        status: 'queued',
      },
    });

    // Enfileira task para envio (fila real — lib/tasks — processada por
    // /api/cron/tasks via pg_cron em prod ou `npm run tasks:dev` em dev)
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      select: { companyId: true },
    });

    if (!application) {
      throw new Error(`Application ${applicationId} não encontrada`);
    }

    await enqueue(
      EMAIL_SEND_TASK,
      { emailLogId: emailLog.id },
      {
        companyId: application.companyId,
        idempotencyKey: `${EMAIL_SEND_TASK}:${emailLog.id}`,
      }
    );

    return emailLog;
  } catch (err) {
    console.error('[enqueueEmail]', err);
    throw err;
  }
}

// Enviador real via Resend (requer RESEND_API_KEY)
export async function sendEmailViaResend(
  to: string,
  subject: string,
  html: string
) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[sendEmailViaResend] RESEND_API_KEY não configurado');
    return { success: false, error: 'Resend API key not configured' };
  }

  try {
    // Lazy-load Resend (opcional, permite usar sem instalar se não precisar enviar)
    // @ts-ignore
    const { Resend } = await import('resend');
    // @ts-ignore
    const resend = new Resend(process.env.RESEND_API_KEY);

    // RESEND_FROM_EMAIL permite override explícito (ex.: domínio próprio já
    // verificado). Sem isso, cai no domínio de teste do Resend em dev —
    // "noreply@inspect-talent.com" exige verificação de domínio e falha com
    // 403 (validation_error) enquanto isso não for feito.
    const fromAddress =
      process.env.RESEND_FROM_EMAIL ||
      (process.env.NODE_ENV === 'production'
        ? 'noreply@inspect-talent.com'
        : 'onboarding@resend.dev');

    const result = await resend.emails.send({
      from: fromAddress,
      to,
      subject,
      html,
    });

    if (result.error) {
      return { success: false, error: result.error.message };
    }

    return { success: true, messageId: result.data.id };
  } catch (error) {
    console.error('[sendEmailViaResend]', error);
    return { success: false, error: String(error) };
  }
}

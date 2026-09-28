import { prisma } from '@/lib/prisma';

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

    // Enfileira task para envio
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      select: { companyId: true },
    });

    if (!application) {
      throw new Error(`Application ${applicationId} não encontrada`);
    }

    await prisma.backgroundTask.create({
      data: {
        companyId: application.companyId,
        type: 'SEND_EMAIL',
        payload: {
          emailLogId: emailLog.id,
          to: recipientEmail,
          subject: renderedSubject,
          html: renderedBody,
        },
        idempotencyKey: `email:${emailLog.id}`,
      },
    });

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

    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@inspect-talent.com',
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

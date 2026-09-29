import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendEmailViaResend } from "@/lib/email";
import { defineTask } from "../registry";
import { PermanentTaskError } from "../errors";

export const EMAIL_SEND_TASK = "email.send";
export const emailSendPayloadSchema = z.object({ emailLogId: z.string().uuid() });

// Envio de e-mail transacional (Fase 1) — o registro em email_logs já guarda
// destinatário/assunto/corpo renderizados (ver lib/email.ts enqueueEmail), o
// payload da tarefa só referencia o log pra não duplicar dado pessoal nas
// duas tabelas.
export const emailSendTask = defineTask({
  type: EMAIL_SEND_TASK,
  payloadSchema: emailSendPayloadSchema,
  handler: async ({ emailLogId }) => {
    const log = await prisma.emailLog.findUnique({ where: { id: emailLogId } });
    if (!log) throw new PermanentTaskError(`EmailLog ${emailLogId} não encontrado`);

    // Idempotência: se uma execução recuperada (travada) já enviou antes de
    // travar, não reenvia.
    if (log.status === "sent") return;

    const result = await sendEmailViaResend(log.recipientEmail, log.subject, log.bodyHtml);

    if (!result.success) {
      await prisma.emailLog.update({
        where: { id: emailLogId },
        data: { status: "failed", errorMessage: result.error },
      });
      // Falha de envio (domínio não verificado, endereço inválido etc.) não
      // se resolve tentando de novo sem mudar configuração — permanente.
      throw new PermanentTaskError(result.error ?? "Falha ao enviar e-mail via Resend");
    }

    await prisma.emailLog.update({
      where: { id: emailLogId },
      data: { status: "sent", sentAt: new Date() },
    });
  },
});

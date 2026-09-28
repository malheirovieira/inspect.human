#!/usr/bin/env tsx
/**
 * Background task processor
 * Processa tasks enfileiradas (SEND_EMAIL, etc)
 *
 * Uso dev: npm run process-tasks
 * Uso prod: Cron job (supabase/cron/process_tasks.sql)
 */

import { prisma } from '@/lib/prisma';
import { sendEmailViaResend } from '@/lib/email';

const BATCH_SIZE = 10;

async function processPendingTasks() {
  console.log('[process-tasks] Iniciando...');

  try {
    // Busca tasks pendentes em lotes
    const tasks = await prisma.backgroundTask.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
      take: BATCH_SIZE,
    });

    if (tasks.length === 0) {
      console.log('[process-tasks] Nenhuma task pendente');
      return;
    }

    console.log(`[process-tasks] Processando ${tasks.length} tasks...`);

    for (const task of tasks) {
      try {
        await processTask(task);
      } catch (error) {
        console.error(`[process-tasks] Erro ao processar task ${task.id}:`, error);
        await markTaskFailed(task.id, String(error));
      }
    }

    console.log('[process-tasks] Concluído');
  } catch (error) {
    console.error('[process-tasks] Erro fatal:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function processTask(task: {
  id: string;
  type: string;
  payload: unknown;
}) {
  switch (task.type) {
    case 'SEND_EMAIL':
      return await processSendEmail(task);
    default:
      console.warn(`[process-tasks] Task type desconhecido: ${task.type}`);
  }
}

async function processSendEmail(task: {
  id: string;
  payload: unknown;
}) {
  const payload = task.payload as {
    emailLogId?: string;
    to?: string;
    subject?: string;
    html?: string;
  };

  if (!payload.emailLogId || !payload.to || !payload.subject || !payload.html) {
    throw new Error('Payload inválido para SEND_EMAIL');
  }

  console.log(`[SEND_EMAIL] Enviando para ${payload.to}...`);

  // Envia via Resend
  const result = await sendEmailViaResend(
    payload.to,
    payload.subject,
    payload.html
  );

  if (!result.success) {
    throw new Error(`Resend error: ${result.error}`);
  }

  // Atualiza email_log como enviado
  await prisma.emailLog.update({
    where: { id: payload.emailLogId },
    data: {
      status: 'sent',
      sentAt: new Date(),
    },
  });

  // Marca task como completa
  await prisma.backgroundTask.update({
    where: { id: task.id },
    data: {
      status: 'completed',
      completedAt: new Date(),
    },
  });

  console.log(`[SEND_EMAIL] ✅ Enviado para ${payload.to}`);
}

async function markTaskFailed(taskId: string, error: string) {
  const task = await prisma.backgroundTask.findUnique({
    where: { id: taskId },
  });

  if (!task) return;

  const nextAttempt = task.attempts + 1;
  const shouldRetry = nextAttempt < task.maxAttempts;

  await prisma.backgroundTask.update({
    where: { id: taskId },
    data: {
      status: shouldRetry ? 'pending' : 'failed',
      attempts: nextAttempt,
      lastError: error,
    },
  });

  if (shouldRetry) {
    console.log(
      `[process-tasks] Task ${taskId} marcada para retry (${nextAttempt}/${task.maxAttempts})`
    );
  } else {
    console.error(
      `[process-tasks] Task ${taskId} falhou após ${task.maxAttempts} tentativas`
    );
  }
}

processPendingTasks();

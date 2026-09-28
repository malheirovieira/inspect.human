#!/usr/bin/env tsx
/**
 * Background task processor
 * Processa tasks enfileiradas (SEND_EMAIL, etc)
 *
 * Uso dev: npm run process-tasks
 * Uso prod: Cron job (supabase/cron/process_tasks.sql)
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Import dinâmico DEPOIS do dotenv.config(): imports estáticos são hoisted
// pelo esbuild/tsx (mesmo compilando para CJS) e rodariam antes do
// dotenv.config() carregar .env.local — lib/prisma.ts leria DATABASE_URL
// undefined nesse caso. Only affects standalone scripts; o Next.js já
// carrega .env.local sozinho, então app/actions/* não precisam disso.
async function loadDeps() {
  const { prisma } = await import('@/lib/prisma');
  const { sendEmailViaResend } = await import('@/lib/email');
  return { prisma, sendEmailViaResend };
}

const BATCH_SIZE = 10;

async function processPendingTasks() {
  console.log('[process-tasks] Iniciando...');
  const { prisma, sendEmailViaResend } = await loadDeps();

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
        await processTask(task, prisma, sendEmailViaResend);
      } catch (error) {
        console.error(`[process-tasks] Erro ao processar task ${task.id}:`, error);
        await markTaskFailed(task.id, String(error), prisma);
      }
    }

    console.log('[process-tasks] Concluído');
  } catch (error) {
    console.error('[process-tasks] Erro fatal:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

async function processTask(
  task: { id: string; type: string; payload: unknown },
  prisma: Awaited<ReturnType<typeof loadDeps>>['prisma'],
  sendEmailViaResend: Awaited<ReturnType<typeof loadDeps>>['sendEmailViaResend']
) {
  switch (task.type) {
    case 'SEND_EMAIL':
      return await processSendEmail(task, prisma, sendEmailViaResend);
    default:
      console.warn(`[process-tasks] Task type desconhecido: ${task.type}`);
  }
}

async function processSendEmail(
  task: { id: string; payload: unknown },
  prisma: Awaited<ReturnType<typeof loadDeps>>['prisma'],
  sendEmailViaResend: Awaited<ReturnType<typeof loadDeps>>['sendEmailViaResend']
) {
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

async function markTaskFailed(
  taskId: string,
  error: string,
  prisma: Awaited<ReturnType<typeof loadDeps>>['prisma']
) {
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

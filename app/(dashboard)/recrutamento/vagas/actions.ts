"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { zodFieldErrors, type FieldErrors } from "@/lib/fieldErrors";
import { jobSchema, JOB_STATUSES, type JobInput } from "@/schemas/job";

// fieldErrors: erro por campo (validação) — o formulário mostra embaixo do campo.
export type ActionResult = { error: string; fieldErrors?: FieldErrors } | { success: true };

export async function createJob(input: JobInput): Promise<ActionResult | never> {
  const session = await requireRole(["ADMIN", "HR"]);

  const parsed = jobSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Corrija os campos destacados.", fieldErrors: zodFieldErrors(parsed.error) };
  }

  const job = await prisma.job.create({
    data: {
      companyId: session.companyId,
      createdById: session.userId,
      title: parsed.data.title,
      description: parsed.data.description,
      department: parsed.data.department || null,
      location: parsed.data.location || null,
      workMode: parsed.data.workMode,
      employmentType: parsed.data.employmentType || null,
      resumeDeadline: parsed.data.resumeDeadline ? new Date(parsed.data.resumeDeadline) : null,
      interviewDeadline: parsed.data.interviewDeadline ? new Date(parsed.data.interviewDeadline) : null,
      hiringDeadline: parsed.data.hiringDeadline ? new Date(parsed.data.hiringDeadline) : null,
      expectedStartDate: parsed.data.expectedStartDate ? new Date(parsed.data.expectedStartDate) : null,
      validThrough: parsed.data.validThrough ? new Date(parsed.data.validThrough) : null,
    },
  });

  revalidatePath("/recrutamento/vagas");
  redirect(`/recrutamento/vagas/${job.id}`);
}

export async function updateJob(jobId: string, input: JobInput): Promise<ActionResult> {
  const session = await requireRole(["ADMIN", "HR"]);

  const parsed = jobSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Corrija os campos destacados.", fieldErrors: zodFieldErrors(parsed.error) };
  }

  const job = await prisma.job.findFirst({ where: { id: jobId, companyId: session.companyId } });
  if (!job) return { error: "Vaga não encontrada." };

  await prisma.job.update({
    where: { id: jobId },
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      department: parsed.data.department || null,
      location: parsed.data.location || null,
      workMode: parsed.data.workMode,
      employmentType: parsed.data.employmentType || null,
      resumeDeadline: parsed.data.resumeDeadline ? new Date(parsed.data.resumeDeadline) : null,
      interviewDeadline: parsed.data.interviewDeadline ? new Date(parsed.data.interviewDeadline) : null,
      hiringDeadline: parsed.data.hiringDeadline ? new Date(parsed.data.hiringDeadline) : null,
      expectedStartDate: parsed.data.expectedStartDate ? new Date(parsed.data.expectedStartDate) : null,
      validThrough: parsed.data.validThrough ? new Date(parsed.data.validThrough) : null,
    },
  });

  revalidatePath("/recrutamento/vagas");
  revalidatePath(`/recrutamento/vagas/${jobId}`);
  return { success: true };
}

// Exclui a vaga de verdade — como candidates.job_id referencia jobs com
// "on delete cascade", apagar a vaga apaga junto todos os candidatos
// recebidos por ela. Só faz sentido pra vaga já encerrada (ver page.tsx,
// que só mostra o botão de excluir quando status === "CLOSED").
export async function deleteJob(jobId: string): Promise<ActionResult> {
  const session = await requireRole(["ADMIN", "HR"]);

  const job = await prisma.job.findFirst({ where: { id: jobId, companyId: session.companyId } });
  if (!job) return { error: "Vaga não encontrada." };

  await prisma.job.delete({ where: { id: jobId } });

  revalidatePath("/recrutamento/vagas");
  return { success: true };
}

export async function setJobStatus(jobId: string, status: (typeof JOB_STATUSES)[number]): Promise<ActionResult> {
  const session = await requireRole(["ADMIN", "HR"]);

  const job = await prisma.job.findFirst({ where: { id: jobId, companyId: session.companyId } });
  if (!job) return { error: "Vaga não encontrada." };

  await prisma.job.update({
    where: { id: jobId },
    data: {
      status,
      publishedAt: status === "OPEN" && !job.publishedAt ? new Date() : undefined,
    },
  });

  revalidatePath("/recrutamento/vagas");
  revalidatePath(`/recrutamento/vagas/${jobId}`);
  return { success: true };
}

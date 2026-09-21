"use server";

import { prisma } from "@/lib/prisma";
import { applyToJobSchema, type ApplyToJobInput } from "@/schemas/candidate";
import { getPublicOpenJob } from "@/services/jobs";

export type ApplyResult = { error: string } | { success: true };

// Candidatura pública — sem sessão. company_id nunca vem do payload do
// cliente: é sempre derivado da vaga buscada no servidor a partir de
// (companySlug, jobId), e a vaga precisa estar com status OPEN.
export async function applyToJob(
  companySlug: string,
  jobId: string,
  input: ApplyToJobInput
): Promise<ApplyResult> {
  const parsed = applyToJobSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const found = await getPublicOpenJob(companySlug, jobId);
  if (!found) return { error: "Vaga não encontrada ou não está mais recebendo candidaturas." };

  await prisma.candidate.create({
    data: {
      companyId: found.company.id,
      jobId: found.job.id,
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      linkedinUrl: parsed.data.linkedinUrl || null,
    },
  });

  return { success: true };
}

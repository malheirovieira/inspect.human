"use server";

import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { applyToJobSchema, PROCESS_STEPS, type ProcessTimeline } from "@/schemas/candidate";
import { getPublicOpenJob } from "@/services/jobs";

export type ApplyResult = { error: string } | { success: true };

const RESUME_BUCKET = "resumes";
const MAX_RESUME_BYTES = 5 * 1024 * 1024;

// Candidatura pública — sem sessão. company_id nunca vem do payload do
// cliente: é sempre derivado da vaga buscada no servidor a partir de
// (companySlug, jobId), e a vaga precisa estar com status OPEN.
//
// Recebe FormData (não um objeto + File soltos): Server Actions do Next só
// aceitam objetos simples/built-ins nos argumentos — um File "solto" como
// argumento dá erro em runtime ("Classes or null prototypes are not
// supported"). FormData é o jeito suportado de mandar arquivo.
//
// O currículo é opcional: criamos o candidato primeiro (garante que a
// candidatura em si nunca se perde) e só depois tentamos subir o PDF pro
// Storage — se o upload falhar, a candidatura já está salva mesmo assim.
export async function applyToJob(companySlug: string, jobId: string, formData: FormData): Promise<ApplyResult> {
  const parsed = applyToJobSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    linkedinUrl: formData.get("linkedinUrl") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const resumeEntry = formData.get("resume");
  const resume = resumeEntry instanceof File && resumeEntry.size > 0 ? resumeEntry : null;

  if (resume) {
    if (resume.type !== "application/pdf") {
      return { error: "O currículo precisa ser um arquivo PDF." };
    }
    if (resume.size > MAX_RESUME_BYTES) {
      return { error: "O PDF do currículo precisa ter até 5MB." };
    }
  }

  const found = await getPublicOpenJob(companySlug, jobId);
  if (!found) return { error: "Vaga não encontrada ou não está mais recebendo candidaturas." };

  const candidate = await prisma.candidate.create({
    data: {
      companyId: found.company.id,
      jobId: found.job.id,
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      linkedinUrl: parsed.data.linkedinUrl || null,
    },
  });

  await prisma.notification.create({
    data: {
      companyId: found.company.id,
      type: "CANDIDATE_APPLIED",
      title: "Nova candidatura",
      message: `${candidate.name} se candidatou para ${found.job.title}`,
      link: `/recrutamento/candidatos/${candidate.id}`,
    },
  });

  if (resume) {
    const path = `${found.company.id}/${candidate.id}.pdf`;
    const supabaseAdmin = createSupabaseAdminClient();
    const { error: uploadError } = await supabaseAdmin.storage
      .from(RESUME_BUCKET)
      .upload(path, resume, { contentType: "application/pdf", upsert: true });

    if (!uploadError) {
      // Currículo em mãos = a etapa "Triagem de currículo" (primeira do
      // processo) já pode ser considerada concluída automaticamente.
      const processSteps: ProcessTimeline = { [PROCESS_STEPS[0]]: new Date().toISOString() };
      await prisma.candidate.update({ where: { id: candidate.id }, data: { resumePath: path, processSteps } });
    } else {
      console.error("Falha ao subir currículo pro Storage:", uploadError);
    }
  }

  return { success: true };
}

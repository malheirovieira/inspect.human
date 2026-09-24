"use server";

import { prisma } from "@/lib/prisma";
import { validateResumeFile } from "@/lib/resumes/files";
import { storeResumeVersion } from "@/lib/resumes/storeResumeVersion";
import { applyToJobSchema } from "@/schemas/candidate";
import { getPublicOpenJob } from "@/services/jobs";
import { logApplicationEvent } from "@/services/applicationEvents";

export type ApplyResult = { error: string } | { success: true };

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
    const fileError = validateResumeFile(resume);
    if (fileError) return { error: fileError };
  }

  const found = await getPublicOpenJob(companySlug, jobId);
  if (!found) return { error: "Vaga não encontrada ou não está mais recebendo candidaturas." };

  // Candidate é a pessoa, reaproveitada entre candidaturas — antes de criar
  // um novo, procura por e-mail dentro da empresa (mesmo candidato pode se
  // candidatar a mais de uma vaga ao longo do tempo).
  let candidate = await prisma.candidate.findFirst({ where: { companyId: found.company.id, email: parsed.data.email } });
  if (!candidate) {
    candidate = await prisma.candidate.create({
      data: {
        companyId: found.company.id,
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        linkedinUrl: parsed.data.linkedinUrl || null,
      },
    });
  }

  const application = await prisma.application.create({
    data: { companyId: found.company.id, candidateId: candidate.id, jobId: found.job.id },
  });

  // actorId null: candidatura pública não tem sessão — evento gerado pelo
  // sistema, não por uma ação de um usuário logado.
  await logApplicationEvent({
    companyId: found.company.id,
    applicationId: application.id,
    type: "APPLICATION_CREATED",
    payload: { source: "PUBLIC_FORM" },
    actorId: null,
  });

  await prisma.notification.create({
    data: {
      companyId: found.company.id,
      type: "CANDIDATE_APPLIED",
      title: "Nova candidatura",
      message: `${candidate.name} se candidatou para ${found.job.title}`,
      link: `/recrutamento/vagas/${found.job.id}/candidaturas/${application.id}`,
    },
  });

  // Versão nova do currículo (ou a mesma, se o arquivo for idêntico) vira a
  // atual da pessoa e fica registrada como a enviada nesta candidatura.
  if (resume) {
    const stored = await storeResumeVersion({
      companyId: found.company.id,
      candidateId: candidate.id,
      file: resume,
      source: "PUBLIC_FORM",
      uploadedById: null,
      applicationId: application.id,
    });
    if (!stored.ok) console.error("Currículo não salvo na candidatura pública:", stored.error);
  }

  return { success: true };
}

import "server-only";
import { prisma } from "@/lib/prisma";

export type AssessmentOption = { id: string; title: string; type: "DISC" | "QUIZ" };

// Lista unificada (DISC + Quiz) das avaliações ativas da empresa — usada no
// seletor de envio da candidatura e na página /avaliacoes.
export async function listActiveAssessments(companyId: string): Promise<AssessmentOption[]> {
  const [discs, quizzes] = await Promise.all([
    prisma.discAssessment.findMany({ where: { companyId, active: true }, select: { id: true, title: true } }),
    prisma.quizAssessment.findMany({ where: { companyId, active: true }, select: { id: true, title: true } }),
  ]);

  return [
    ...discs.map((d) => ({ id: d.id, title: d.title, type: "DISC" as const })),
    ...quizzes.map((q) => ({ id: q.id, title: q.title, type: "QUIZ" as const })),
  ];
}

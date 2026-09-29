"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { DISC_QUESTIONS } from "@/lib/disc/questions";

type ActionResult = { success: true } | { success: false; error: string };

// Edita o texto de uma das 60 afirmações fixas — afeta só avaliações
// futuras: disc_answers já gravadas referenciam question_id, não guardam o
// texto, então respostas antigas continuam associadas à pergunta como ela
// era, sem precisar de histórico/versionamento à parte.
export async function updateDiscQuestion(questionId: string, text: string): Promise<ActionResult> {
  try {
    const session = await requireRole(["ADMIN", "HR"]);

    const trimmed = text.trim();
    if (!trimmed) return { success: false, error: "Texto não pode ser vazio" };
    if (trimmed.length < 10) return { success: false, error: "Texto muito curto" };

    const question = await prisma.discQuestion.findUnique({
      where: { id: questionId },
      include: { assessment: { select: { companyId: true } } },
    });
    if (!question) return { success: false, error: "Pergunta não encontrada" };
    if (question.assessment.companyId !== session.companyId) {
      return { success: false, error: "Sem permissão para editar esta pergunta" };
    }

    await prisma.discQuestion.update({ where: { id: questionId }, data: { text: trimmed } });

    revalidatePath("/recrutamento/disc/perguntas");
    return { success: true };
  } catch (err) {
    console.error("[updateDiscQuestion]", err);
    return { success: false, error: "Erro ao salvar" };
  }
}

// Restaura as 60 afirmações da empresa pro texto original de lib/disc/questions.ts.
export async function resetDiscQuestions(): Promise<ActionResult> {
  try {
    const session = await requireRole(["ADMIN", "HR"]);

    const assessment = await prisma.discAssessment.findFirst({
      where: { companyId: session.companyId },
      include: { questions: { select: { id: true, position: true } } },
    });
    if (!assessment) return { success: false, error: "Avaliação DISC não encontrada" };

    const updates = DISC_QUESTIONS.map((original) => {
      const question = assessment.questions.find((q) => q.position === original.position);
      if (!question) return null;
      return prisma.discQuestion.update({ where: { id: question.id }, data: { text: original.text } });
    }).filter((update): update is NonNullable<typeof update> => update !== null);

    await prisma.$transaction(updates);

    revalidatePath("/recrutamento/disc/perguntas");
    return { success: true };
  } catch (err) {
    console.error("[resetDiscQuestions]", err);
    return { success: false, error: "Erro ao restaurar" };
  }
}

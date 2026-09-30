import { Suspense } from "react";
import { DiscForm } from "@/app/components/disc/DiscForm";
import { QuizForm } from "@/app/components/disc/QuizForm";
import { prisma } from "@/lib/prisma";
import type { DiscPublicQuestion, PublicAssessmentData } from "@/lib/types/disc";

interface PageProps {
  params: { token: string };
}

// Consulta o Prisma direto em vez de fazer self-fetch pra
// /api/avaliacao/[token]: esse fetch dependia de VERCEL_URL, que só existe
// em deploys na Vercel — fora dela cai no fallback "http://localhost:3000",
// que não responde em produção e derruba a página com "Application error".
async function loadAssessment(token: string): Promise<PublicAssessmentData | null> {
  const discResponse = await prisma.discResponse.findUnique({
    where: { token },
    include: { assessment: true },
  });

  if (discResponse) {
    if (discResponse.submittedAt || discResponse.expiresAt < new Date()) return null;

    const questions = await prisma.discQuestion.findMany({
      where: { assessmentId: discResponse.assessmentId },
      orderBy: { position: "asc" },
      select: { id: true, position: true, section: true, dimension: true, text: true },
    });

    return { type: "DISC", title: discResponse.assessment.title, questions: questions as DiscPublicQuestion[] };
  }

  const quizResponse = await prisma.quizResponse.findUnique({
    where: { token },
    include: { assessment: true },
  });

  if (quizResponse) {
    if (quizResponse.submittedAt || quizResponse.expiresAt < new Date()) return null;

    const questions = await prisma.quizQuestion.findMany({
      where: { assessmentId: quizResponse.assessmentId },
      orderBy: { position: "asc" },
      include: {
        // is_correct nunca vai pro cliente — omitido explicitamente abaixo.
        choices: { orderBy: { position: "asc" }, select: { id: true, position: true, text: true } },
      },
    });

    return {
      type: "QUIZ",
      title: quizResponse.assessment.title,
      questions: questions.map((q) => ({ id: q.id, position: q.position, text: q.text, choices: q.choices })),
    };
  }

  return null;
}

export default async function AvaliacaoPage({ params }: PageProps) {
  const data = await loadAssessment(params.token);

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <h1 className="text-xl font-bold text-gray-900 mb-2">Link Inválido</h1>
            <p className="text-gray-600 mb-4">
              O link de avaliação não foi encontrado, expirou ou já foi respondido.
            </p>
            <p className="text-sm text-gray-500">Se acredita que é um erro, entre em contato com o recrutador.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow p-8">
          <Suspense fallback={<div className="text-center text-gray-500">Carregando questionário...</div>}>
            {data.type === "DISC" ? (
              <DiscForm data={data} token={params.token} />
            ) : (
              <QuizForm data={data} token={params.token} />
            )}
          </Suspense>
        </div>
      </div>
    </div>
  );
}

export const metadata = {
  title: "Avaliação Comportamental - Inspect Talent",
  description: "Responda sua avaliação comportamental DISC",
};

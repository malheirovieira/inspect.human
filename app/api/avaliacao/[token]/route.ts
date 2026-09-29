import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Route Handler GET: /api/avaliacao/[token]
// Serve a avaliação DISC pelo token público (candidato sem login) — via
// Prisma (conexão direta, ignora RLS), mesmo padrão do resto do projeto.
// O sistema genérico de assessments (assessment_responses/...) não usa
// mais esta rota; segue no banco sem uso.
export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const token = params.token;

  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Token inválido" }, { status: 400 });
  }

  try {
    const response = await prisma.discResponse.findUnique({
      where: { token },
      include: { assessment: true },
    });

    if (!response) {
      return NextResponse.json({ error: "Link não encontrado ou inválido" }, { status: 404 });
    }
    if (response.submittedAt) {
      return NextResponse.json({ error: "Este questionário já foi respondido" }, { status: 410 });
    }
    if (response.expiresAt < new Date()) {
      return NextResponse.json({ error: "Link expirado" }, { status: 410 });
    }

    const questions = await prisma.discQuestion.findMany({
      where: { assessmentId: response.assessmentId },
      orderBy: { position: "asc" },
      select: { id: true, position: true, section: true, dimension: true, text: true },
    });

    return NextResponse.json({
      title: response.assessment.title,
      questions,
    });
  } catch (err) {
    console.error("[avaliacao/route]", err);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

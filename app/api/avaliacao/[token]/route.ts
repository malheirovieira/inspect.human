import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Route Handler GET: /api/avaliacao/[token]
// Serve DISC ou Quiz pelo token público (candidato sem login) — via Prisma
// (conexão direta, ignora RLS), mesmo padrão do resto do projeto. O token é
// @unique em cada tabela separadamente, então nunca colide entre os dois
// tipos; tenta DISC primeiro, cai pra Quiz se não achar.
export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const token = params.token;

  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Token inválido" }, { status: 400 });
  }

  try {
    const discResponse = await prisma.discResponse.findUnique({
      where: { token },
      include: { assessment: true },
    });

    if (discResponse) {
      if (discResponse.submittedAt) return NextResponse.json({ error: "Este questionário já foi respondido" }, { status: 410 });
      if (discResponse.expiresAt < new Date()) return NextResponse.json({ error: "Link expirado" }, { status: 410 });

      const questions = await prisma.discQuestion.findMany({
        where: { assessmentId: discResponse.assessmentId },
        orderBy: { position: "asc" },
        select: { id: true, position: true, section: true, dimension: true, text: true },
      });

      return NextResponse.json({ type: "DISC", title: discResponse.assessment.title, questions });
    }

    const quizResponse = await prisma.quizResponse.findUnique({
      where: { token },
      include: { assessment: true },
    });

    if (quizResponse) {
      if (quizResponse.submittedAt) return NextResponse.json({ error: "Este questionário já foi respondido" }, { status: 410 });
      if (quizResponse.expiresAt < new Date()) return NextResponse.json({ error: "Link expirado" }, { status: 410 });

      const questions = await prisma.quizQuestion.findMany({
        where: { assessmentId: quizResponse.assessmentId },
        orderBy: { position: "asc" },
        include: {
          // is_correct NUNCA vai pro cliente — omitido explicitamente abaixo.
          choices: { orderBy: { position: "asc" }, select: { id: true, position: true, text: true } },
        },
      });

      return NextResponse.json({
        type: "QUIZ",
        title: quizResponse.assessment.title,
        questions: questions.map((q) => ({ id: q.id, position: q.position, text: q.text, choices: q.choices })),
      });
    }

    return NextResponse.json({ error: "Link não encontrado ou inválido" }, { status: 404 });
  } catch (err) {
    console.error("[avaliacao/route]", err);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

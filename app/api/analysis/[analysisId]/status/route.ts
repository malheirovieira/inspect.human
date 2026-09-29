import "server-only";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// Endpoint leve usado pelo AutoRefresh enquanto uma análise está PROCESSING.
// Retorna apenas {status, errorCode} — 1 query rápida em vez de recarregar
// toda a página. Quando o status muda, o componente faz UM router.refresh()
// para buscar o resultado completo.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ analysisId: string }> }
) {
  const { analysisId } = await params;

  // API route — não redirecionar; retornar 401 diretamente. companyId só é
  // null pra SUPERADMIN, já excluído pela checagem de role acima.
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "HR") || !session.companyId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const analysis = await prisma.resumeAnalysis.findFirst({
    where: { id: analysisId, companyId: session.companyId },
    select: { status: true, errorCode: true },
  });

  if (!analysis) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  return NextResponse.json({ status: analysis.status, errorCode: analysis.errorCode });
}

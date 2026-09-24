import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export type SearchResultItem = { id: string; label: string; sublabel: string | null; href: string };
export type SearchResponse = {
  colaboradores: SearchResultItem[];
  vagas: SearchResultItem[];
  candidatos: SearchResultItem[];
};

const EMPTY: SearchResponse = { colaboradores: [], vagas: [], candidatos: [] };

// Busca global do header do dashboard. Só ADMIN/HR veem resultado (mesmo
// corte de visibilidade já usado no restante do sistema — EMPLOYEE não tem
// acesso às telas de colaboradores/vagas/candidatos). Usa getSession() (não
// requireRole/requireSession) porque esta é uma rota de API consumida via
// fetch: redirect() geraria um 307 para /login em vez de JSON.
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json(EMPTY, { status: 401 });
  if (session.role !== "ADMIN" && session.role !== "HR") return NextResponse.json(EMPTY);

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json(EMPTY);

  const { companyId } = session;

  const [colaboradores, vagas, candidatos] = await Promise.all([
    prisma.user.findMany({
      where: { companyId, active: true, name: { contains: q, mode: "insensitive" } },
      select: { id: true, name: true, position: true },
      take: 5,
    }),
    prisma.job.findMany({
      where: { companyId, title: { contains: q, mode: "insensitive" } },
      select: { id: true, title: true, department: true },
      take: 5,
    }),
    prisma.application.findMany({
      where: { companyId, candidate: { name: { contains: q, mode: "insensitive" } } },
      select: { id: true, jobId: true, candidate: { select: { name: true, email: true } } },
      take: 5,
    }),
  ]);

  const response: SearchResponse = {
    colaboradores: colaboradores.map((c) => ({
      id: c.id,
      label: c.name,
      sublabel: c.position,
      href: `/colaboradores/${c.id}/editar`,
    })),
    vagas: vagas.map((j) => ({
      id: j.id,
      label: j.title,
      sublabel: j.department,
      href: `/recrutamento/vagas/${j.id}`,
    })),
    candidatos: candidatos.map((a) => ({
      id: a.id,
      label: a.candidate.name,
      sublabel: a.candidate.email,
      href: `/recrutamento/vagas/${a.jobId}/candidaturas/${a.id}`,
    })),
  };

  return NextResponse.json(response);
}

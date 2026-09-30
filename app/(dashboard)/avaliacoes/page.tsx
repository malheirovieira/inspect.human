import Link from "next/link";
import { Settings, BarChart3, ClipboardList } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { NewAssessmentSection } from "@/components/avaliacoes/NewAssessmentSection";
import { DeleteAssessmentButton } from "@/components/avaliacoes/DeleteAssessmentButton";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

export default async function AvaliacoesPage() {
  const session = await requireRole(["ADMIN", "HR"]);

  const [discs, quizzes] = await Promise.all([
    prisma.discAssessment.findMany({
      where: { companyId: session.companyId },
      orderBy: { createdAt: "desc" },
      include: {
        questions: { select: { id: true } },
        responses: { where: { submittedAt: { not: null } }, select: { id: true } },
      },
    }),
    prisma.quizAssessment.findMany({
      where: { companyId: session.companyId },
      orderBy: { createdAt: "desc" },
      include: {
        questions: { select: { id: true } },
        responses: { where: { submittedAt: { not: null } }, select: { id: true } },
      },
    }),
  ]);

  const cards = [
    ...discs.map((a) => ({
      id: a.id,
      kind: "DISC" as const,
      title: a.title,
      active: a.active,
      questionCount: a.questions.length,
      responseCount: a.responses.length,
      editHref: `/avaliacoes/disc/${a.id}`,
    })),
    ...quizzes.map((a) => ({
      id: a.id,
      kind: "QUIZ" as const,
      title: a.title,
      active: a.active,
      scored: a.scored,
      questionCount: a.questions.length,
      responseCount: a.responses.length,
      editHref: `/avaliacoes/quiz/${a.id}`,
    })),
  ];

  return (
    <>
      <Header title="Avaliações" breadcrumb={[{ label: "Avaliações" }]} />
      <div className="fin-content">
        <NewAssessmentSection />

        {cards.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Nenhuma avaliação cadastrada"
            description='Use "Nova Avaliação" acima para criar a primeira (DISC ou de múltipla escolha).'
          />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {cards.map((card) => (
              <Card key={`${card.kind}:${card.id}`} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{card.title}</div>
                    <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                      <Badge tone="primary">{card.kind === "DISC" ? "DISC" : card.scored ? "Pontuação" : "Sem pontuação"}</Badge>
                      {!card.active && <Badge tone="danger">Arquivada</Badge>}
                    </div>
                  </div>
                  <DeleteAssessmentButton id={card.id} kind={card.kind} />
                </div>

                <div style={{ display: "flex", gap: 20, fontSize: 13, color: "var(--text-muted)" }}>
                  <span>{card.questionCount} perguntas</span>
                  <span>{card.responseCount} respostas</span>
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
                  <Link href={card.editHref} style={{ textDecoration: "none", flex: 1 }}>
                    <Button type="button" variant="secondary" style={{ width: "100%" }}>
                      <Settings size={14} />
                      Editar Perguntas
                    </Button>
                  </Link>
                  <Link href={`${card.editHref}?tab=resultados`} style={{ textDecoration: "none", flex: 1 }}>
                    <Button type="button" variant="secondary" style={{ width: "100%" }}>
                      <BarChart3 size={14} />
                      Resultados
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export const metadata = {
  title: "Avaliações - Inspect Talent",
};

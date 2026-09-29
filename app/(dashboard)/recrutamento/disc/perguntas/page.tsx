import { notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { DiscQuestionEditor } from "@/components/recrutamento/DiscQuestionEditor";
import { ResetDiscQuestionsButton } from "@/components/recrutamento/ResetDiscQuestionsButton";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { COMPETENCIA_DIMENSIONS, DISC_DIMENSIONS, DISC_DIMENSION_LABELS } from "@/lib/disc/questions";

type DiscQuestionRow = { id: string; position: number; section: string; dimension: string; text: string };

function groupByDimension(questions: DiscQuestionRow[], section: string): Record<string, DiscQuestionRow[]> {
  const grouped: Record<string, DiscQuestionRow[]> = {};
  for (const q of questions) {
    if (q.section !== section) continue;
    (grouped[q.dimension] ??= []).push(q);
  }
  return grouped;
}

export default async function DiscPerguntasPage() {
  const session = await requireRole(["ADMIN", "HR"]);

  const assessment = await prisma.discAssessment.findFirst({
    where: { companyId: session.companyId },
    include: { questions: { orderBy: { position: "asc" } } },
  });
  if (!assessment) notFound();

  const competencias = groupByDimension(assessment.questions, "COMPETENCIAS");
  const disc = groupByDimension(assessment.questions, "DISC");

  return (
    <>
      <Header
        title="Editar Perguntas DISC"
        backHref="/recrutamento/disc"
        breadcrumb={[{ label: "Recrutamento" }, { label: "DISC", href: "/recrutamento/disc" }, { label: "Perguntas" }]}
      />
      <div className="fin-content">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--ink)", margin: 0 }}>Perguntas da Avaliação</h2>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>
              Edições afetam avaliações futuras. Candidatos que já responderam não são alterados.
            </p>
          </div>
          <ResetDiscQuestionsButton />
        </div>

        <div>
          <span className="fin-eyebrow">PARTE 1 — COMPETÊNCIAS</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 12 }}>
            {COMPETENCIA_DIMENSIONS.map((dimension) => (
              <Card key={dimension} style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 8 }}>
                  {dimension}
                </span>
                {competencias[dimension]?.map((q) => (
                  <DiscQuestionEditor key={q.id} questionId={q.id} position={q.position} text={q.text} />
                ))}
              </Card>
            ))}
          </div>
        </div>

        <div>
          <span className="fin-eyebrow">PARTE 2 — PERFIL DISC</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 12 }}>
            {DISC_DIMENSIONS.map((dimension) => (
              <Card key={dimension} style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 8 }}>
                  {DISC_DIMENSION_LABELS[dimension]} ({dimension})
                </span>
                {disc[dimension]?.map((q) => (
                  <DiscQuestionEditor key={q.id} questionId={q.id} position={q.position} text={q.text} />
                ))}
              </Card>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export const metadata = {
  title: "Editar Perguntas DISC - Inspect Talent",
};

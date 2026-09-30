import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { DiscQuestionEditor } from "@/components/recrutamento/DiscQuestionEditor";
import { ResetDiscQuestionsButton } from "@/components/recrutamento/ResetDiscQuestionsButton";
import { NewDiscQuestionForm } from "@/components/avaliacoes/NewDiscQuestionForm";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { COMPETENCIA_DIMENSIONS, DISC_DIMENSIONS, DISC_DIMENSION_LABELS, DISC_QUESTIONS } from "@/lib/disc/questions";

type DiscQuestionRow = { id: string; position: number; section: string; dimension: string; text: string };

function groupByDimension(questions: DiscQuestionRow[], section: string): Record<string, DiscQuestionRow[]> {
  const grouped: Record<string, DiscQuestionRow[]> = {};
  for (const q of questions) {
    if (q.section !== section) continue;
    (grouped[q.dimension] ??= []).push(q);
  }
  return grouped;
}

export default async function DiscAssessmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await requireRole(["ADMIN", "HR"]);
  const { id } = await params;
  const { tab } = await searchParams;
  const showResults = tab === "resultados";

  const assessment = await prisma.discAssessment.findFirst({
    where: { id, companyId: session.companyId },
    include: {
      questions: { orderBy: { position: "asc" } },
      responses: {
        where: { submittedAt: { not: null } },
        orderBy: { submittedAt: "desc" },
        include: { application: { include: { candidate: { select: { name: true } }, job: { select: { id: true, title: true } } } } },
      },
    },
  });
  if (!assessment) notFound();

  const competencias = groupByDimension(assessment.questions, "COMPETENCIAS");
  const disc = groupByDimension(assessment.questions, "DISC");
  // A seção "Competências" é específica do modelo padrão de 60 perguntas
  // (seedado via scripts/seedDisc.ts) — avaliações DISC novas, criadas pelo
  // recrutador, só têm a parte de perfil D/I/S/C.
  const isDefaultModel = DISC_QUESTIONS.some((q) => q.section === "COMPETENCIAS") && Object.keys(competencias).length > 0;

  return (
    <>
      <Header
        title={assessment.title}
        backHref="/avaliacoes"
        breadcrumb={[{ label: "Avaliações", href: "/avaliacoes" }, { label: assessment.title }]}
      />
      <div className="fin-content">
        <div style={{ display: "flex", alignItems: "center", gap: 4, borderBottom: "1px solid var(--border)" }}>
          {[
            { key: "perguntas", label: "Perguntas", href: `/avaliacoes/disc/${id}` },
            { key: "resultados", label: "Resultados", href: `/avaliacoes/disc/${id}?tab=resultados` },
          ].map((t) => {
            const active = showResults ? t.key === "resultados" : t.key === "perguntas";
            return (
              <Link
                key={t.key}
                href={t.href}
                style={{
                  padding: "10px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: "none",
                  color: active ? "var(--action-primary-text)" : "var(--text-muted)",
                  borderBottom: active ? "2px solid var(--action-primary)" : "2px solid transparent",
                }}
              >
                {t.label}
              </Link>
            );
          })}
        </div>

        {showResults ? (
          <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <span className="fin-eyebrow">RESULTADOS</span>
            {assessment.responses.length === 0 ? (
              <p style={{ fontSize: 14, color: "var(--text-muted)", margin: 0 }}>Nenhum candidato respondeu a avaliação ainda.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {assessment.responses.map((response) => (
                  <Link
                    key={response.id}
                    href={`/recrutamento/vagas/${response.application.job.id}/candidaturas/${response.applicationId}?tab=avaliacoes`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "12px 0",
                      borderBottom: "1px solid var(--border)",
                      color: "inherit",
                      textDecoration: "none",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 500, color: "var(--ink)" }}>{response.application.candidate.name}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{response.application.job.title}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 600, color: "var(--ink)" }}>{response.perfilDisc}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {Number(response.scoreGeral).toFixed(0)}/100{response.nivelGeral ? ` · ${response.nivelGeral}` : ""}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        ) : (
          <>
            {isDefaultModel && (
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <ResetDiscQuestionsButton />
              </div>
            )}

            {isDefaultModel && (
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
            )}

            <div>
              <span className="fin-eyebrow">{isDefaultModel ? "PARTE 2 — PERFIL DISC" : "PERGUNTAS"}</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 12 }}>
                {DISC_DIMENSIONS.map((dimension) => (
                  <Card key={dimension} style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 8 }}>
                      {DISC_DIMENSION_LABELS[dimension]} ({dimension})
                    </span>
                    {disc[dimension]?.map((q) => (
                      <DiscQuestionEditor key={q.id} questionId={q.id} position={q.position} text={q.text} deletable={!isDefaultModel} />
                    ))}
                    {!isDefaultModel && <NewDiscQuestionForm assessmentId={id} dimension={dimension} />}
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

export const metadata = {
  title: "Editar Avaliação DISC - Inspect Talent",
};

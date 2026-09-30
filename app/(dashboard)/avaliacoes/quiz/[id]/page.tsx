import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { QuizQuestionRow } from "@/components/avaliacoes/QuizQuestionRow";
import { NewQuizQuestionForm } from "@/components/avaliacoes/NewQuizQuestionForm";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

export default async function QuizAssessmentPage({
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

  const assessment = await prisma.quizAssessment.findFirst({
    where: { id, companyId: session.companyId },
    include: {
      questions: { orderBy: { position: "asc" }, include: { choices: { orderBy: { position: "asc" } } } },
      responses: {
        where: { submittedAt: { not: null } },
        orderBy: { submittedAt: "desc" },
        include: { application: { include: { candidate: { select: { name: true } }, job: { select: { id: true, title: true } } } } },
      },
    },
  });
  if (!assessment) notFound();

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
            { key: "perguntas", label: "Perguntas", href: `/avaliacoes/quiz/${id}` },
            { key: "resultados", label: "Resultados", href: `/avaliacoes/quiz/${id}?tab=resultados` },
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
                    <div style={{ fontWeight: 600, color: "var(--ink)" }}>
                      {assessment.scored ? `${response.score}/${response.maxScore} pts` : "Sem pontuação"}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        ) : (
          <Card style={{ display: "flex", flexDirection: "column" }}>
            <span className="fin-eyebrow" style={{ marginBottom: 8 }}>
              PERGUNTAS
            </span>
            {assessment.questions.map((q) => (
              <QuizQuestionRow
                key={q.id}
                questionId={q.id}
                position={q.position}
                text={q.text}
                maxScore={q.maxScore}
                scored={assessment.scored}
                choices={q.choices}
              />
            ))}
            <NewQuizQuestionForm assessmentId={id} scored={assessment.scored} />
          </Card>
        )}
      </div>
    </>
  );
}

export const metadata = {
  title: "Editar Avaliação - Inspect Talent",
};

import Link from "next/link";
import { Settings } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { DISC_DIMENSION_LABELS } from "@/lib/disc/questions";

export default async function DiscPage() {
  const session = await requireRole(["ADMIN", "HR"]);

  const assessment = await prisma.discAssessment.findFirst({
    where: { companyId: session.companyId },
    include: {
      questions: { select: { id: true } },
      responses: {
        where: { submittedAt: { not: null } },
        orderBy: { submittedAt: "desc" },
        include: { application: { include: { candidate: { select: { name: true } }, job: { select: { id: true, title: true } } } } },
      },
    },
  });

  return (
    <>
      <Header title="DISC" breadcrumb={[{ label: "Recrutamento" }, { label: "DISC" }]} />
      <div className="fin-content">
        {!assessment ? (
          <Card>
            <p style={{ fontSize: 14, color: "var(--text-muted)", margin: 0 }}>
              Nenhuma avaliação DISC configurada para esta empresa ainda.
            </p>
          </Card>
        ) : (
          <>
            <Card style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span className="fin-eyebrow">{assessment.title}</span>
                <div style={{ display: "flex", gap: 24, fontSize: 14, color: "var(--text-muted)" }}>
                  <span>{assessment.questions.length} perguntas</span>
                  <span>{assessment.responses.length} respostas enviadas</span>
                </div>
              </div>
              <Link href="/recrutamento/disc/perguntas" style={{ textDecoration: "none" }}>
                <Button type="button" variant="secondary">
                  <Settings size={14} />
                  Editar Perguntas
                </Button>
              </Link>
            </Card>

            <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <span className="fin-eyebrow">RESULTADOS</span>
              {assessment.responses.length === 0 ? (
                <p style={{ fontSize: 14, color: "var(--text-muted)", margin: 0 }}>
                  Nenhum candidato respondeu a avaliação ainda.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {assessment.responses.map((response) => (
                    <Link
                      key={response.id}
                      href={`/recrutamento/vagas/${response.application.job.id}/candidaturas/${response.applicationId}`}
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
                        <div style={{ fontWeight: 600, color: "var(--ink)" }}>
                          {response.perfilDisc}
                          {response.perfilDisc && response.perfilDisc.length === 1
                            ? ` — ${DISC_DIMENSION_LABELS[response.perfilDisc as keyof typeof DISC_DIMENSION_LABELS]}`
                            : ""}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                          {Number(response.scoreGeral).toFixed(0)}/100 · {response.nivelGeral}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </>
  );
}

export const metadata = {
  title: "DISC - Inspect Talent",
};

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ClipboardList } from "lucide-react";

type DiscItem = {
  kind: "DISC";
  id: string;
  title: string;
  submittedAt: Date | null;
  expiresAt: Date;
  perfilDisc: string | null;
  scoreGeral: unknown;
};
type QuizItem = {
  kind: "QUIZ";
  id: string;
  title: string;
  submittedAt: Date | null;
  expiresAt: Date;
  scored: boolean;
  score: number | null;
  maxScore: number | null;
};

export type AssessmentTabItem = DiscItem | QuizItem;

function statusLabel(item: AssessmentTabItem): { label: string; tone: "success" | "primary" | "danger" } {
  if (item.submittedAt) return { label: "Respondida", tone: "success" };
  if (item.expiresAt < new Date()) return { label: "Expirada", tone: "danger" };
  return { label: "Enviada", tone: "primary" };
}

function resultLabel(item: AssessmentTabItem): string | null {
  if (!item.submittedAt) return null;
  if (item.kind === "DISC") return `Perfil ${item.perfilDisc} — ${Number(item.scoreGeral).toFixed(0)}/100`;
  if (!item.scored) return "Sem pontuação";
  return `${item.score}/${item.maxScore} pts`;
}

// Aba "Avaliações" da candidatura — lista DISC + Quiz enviados pro
// candidato, cada um com seu próprio status/resultado (migration 0036
// permite mais de uma avaliação por candidatura).
export function AssessmentsTab({ items }: { items: AssessmentTabItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Nenhuma avaliação enviada"
        description='Use "Enviar Avaliação" acima para mandar a primeira.'
      />
    );
  }

  return (
    <Card style={{ padding: 0 }}>
      {items.map((item, index) => {
        const status = statusLabel(item);
        const result = resultLabel(item);
        return (
          <div
            key={`${item.kind}:${item.id}`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: "16px 20px",
              borderTop: index === 0 ? "none" : "1px solid var(--border)",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>{item.title}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{item.kind === "DISC" ? "DISC" : "Quiz"}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {result && <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{result}</span>}
              <Badge tone={status.tone}>{status.label}</Badge>
            </div>
          </div>
        );
      })}
    </Card>
  );
}

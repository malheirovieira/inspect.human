import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { ProgressBar } from "@/components/ui/ProgressBar";

// Dados de exemplo — Fase 1 é só o design system funcionando.
// Fase 2+ substitui isto por dados reais vindos dos services (Prisma/Supabase).
const trainingProgress = [
  { name: "João Silva", percent: 80 },
  { name: "Maria Souza", percent: 60 },
  { name: "Carlos Oliveira", percent: 35 },
];

const recruitmentSummary = [
  { stage: "Triagem", count: 18 },
  { stage: "Entrevista", count: 7 },
  { stage: "Proposta", count: 3 },
  { stage: "Contratado", count: 2 },
];

export default function DashboardPage() {
  return (
    <>
      <Header title="Dashboard" />
      <div className="fin-content">
        <div className="fin-row">
          <StatCard label="Colaboradores" value="24" />
          <StatCard label="Vagas abertas" value="4" />
          <StatCard label="Candidatos" value="38" />
          <StatCard label="Treinamentos em andamento" value="12" />
          <StatCard label="Pontos hoje" value="42" />
          <StatCard label="Variáveis da folha" value="R$ 8.450,00" />
        </div>

        <div className="fin-row" style={{ alignItems: "stretch" }}>
          <Card style={{ flex: 1 }}>
            <span className="fin-eyebrow">RECRUTAMENTO</span>
            <div className="fin-heading" style={{ marginBottom: 14 }}>
              Resumo do Kanban
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {recruitmentSummary.map((s) => (
                <div key={s.stage} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "var(--text-secondary)" }}>{s.stage}</span>
                  <strong>{s.count}</strong>
                </div>
              ))}
            </div>
          </Card>

          <Card style={{ flex: 1 }}>
            <span className="fin-eyebrow">DESENVOLVIMENTO</span>
            <div className="fin-heading" style={{ marginBottom: 14 }}>
              Progresso dos treinamentos
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {trainingProgress.map((t) => (
                <div key={t.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                    <span>{t.name}</span>
                    <strong>{t.percent}%</strong>
                  </div>
                  <ProgressBar percent={t.percent} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

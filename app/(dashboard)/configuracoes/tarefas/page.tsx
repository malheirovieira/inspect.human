import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { RetryTaskButton } from "@/components/configuracoes/RetryTaskButton";
import { requireRole } from "@/lib/session";
import { getTaskOverview } from "@/services/backgroundTasks";

const TASK_TYPE_LABELS: Record<string, string> = {
  "resume.analyze": "Resumo de currículo por IA",
  "resume.purge_versions": "Limpeza de versões antigas de currículo",
};

const STATUS_LABELS = {
  pending: "Na fila",
  running: "Em execução",
  done: "Concluídas",
  failed: "Falharam",
} as const;

const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export default async function TarefasPage() {
  // Só ADMIN — acesso direto por HR/EMPLOYEE volta pro dashboard.
  await requireRole(["ADMIN"]);
  const { counts, failures } = await getTaskOverview();

  return (
    <>
      <Header
        title="Tarefas em segundo plano"
        backHref="/configuracoes"
        breadcrumb={[{ label: "Configurações", href: "/configuracoes" }, { label: "Tarefas" }]}
      />
      <div className="fin-content">
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
          Processamentos que rodam fora da tela (ex.: envio de e-mail, resumo de currículo). Concluídas somem após
          30 dias; falhas, após 90.
        </p>

        <div className="fin-row" style={{ flexWrap: "wrap" }}>
          {(Object.keys(STATUS_LABELS) as (keyof typeof STATUS_LABELS)[]).map((status) => (
            <StatCard key={status} label={STATUS_LABELS[status]} value={String(counts[status])} />
          ))}
        </div>

        <div>
          <span className="fin-eyebrow">FALHAS</span>
          <div className="fin-heading" style={{ marginBottom: 0 }}>
            Últimas falhas
          </div>
        </div>

        {failures.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="Nenhuma falha" description="Nenhuma tarefa da empresa falhou." />
        ) : (
          <Card style={{ padding: 0 }}>
            {failures.map((task, i) => (
              <div
                key={task.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  padding: "14px 20px",
                  borderTop: i === 0 ? "none" : "1px solid var(--border)",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {TASK_TYPE_LABELS[task.type] ?? task.type}
                    <span style={{ fontSize: 12, fontWeight: 400, color: "var(--text-muted)" }}> · {task.type}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                    {dateFormat.format(new Date(task.updatedAt))} · {task.attempts}/{task.maxAttempts} tentativas
                  </div>
                  {task.lastError && (
                    <div
                      style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 6, overflowWrap: "anywhere" }}
                    >
                      <span style={{ fontWeight: 600 }}>Motivo técnico: </span>
                      {task.lastError}
                    </div>
                  )}
                </div>
                {task.candidateHref ? (
                  // Resumo por IA: nova geração se pede no perfil (a análise já
                  // foi finalizada — reenviar a tarefa não faria nada).
                  <Link href={task.candidateHref}>
                    <Button variant="secondary">Abrir perfil do candidato</Button>
                  </Link>
                ) : (
                  <RetryTaskButton taskId={task.id} />
                )}
              </div>
            ))}
          </Card>
        )}
      </div>
    </>
  );
}

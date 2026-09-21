import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListToolbar } from "@/components/ui/ListToolbar";
import { NewExitToggle } from "@/components/desligamentos/NewExitToggle";
import { UserX } from "lucide-react";
import { listEmployeeExits } from "@/services/employeeExits";
import { listColaboradores } from "@/services/colaboradores";
import { EXIT_TYPES, EXIT_TYPE_LABELS, EXIT_REASONS, EXIT_REASON_LABELS } from "@/schemas/employeeExit";

function formatDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export default async function DesligamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; exitType?: string; reason?: string }>;
}) {
  const { q, exitType, reason } = await searchParams;
  const [exits, colaboradores] = await Promise.all([
    listEmployeeExits({ q, exitType, reason }),
    listColaboradores({ status: "active" }),
  ]);
  const hasFilters = Boolean(q || exitType || reason);

  return (
    <>
      <Header eyebrow="PESSOAS" title="Desligamentos" />
      <div className="fin-content">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <ListToolbar
            searchPlaceholder="Buscar por nome..."
            filters={[
              {
                key: "exitType",
                label: "Todos os tipos",
                options: EXIT_TYPES.map((t) => ({ value: t, label: EXIT_TYPE_LABELS[t] })),
              },
              {
                key: "reason",
                label: "Todos os motivos",
                options: EXIT_REASONS.map((r) => ({ value: r, label: EXIT_REASON_LABELS[r] })),
              },
            ]}
          />
          <NewExitToggle
            colaboradores={colaboradores.map((c) => ({
              id: c.id,
              name: c.name,
              position: c.position,
              department: c.department,
            }))}
          />
        </div>

        {exits.length === 0 ? (
          <EmptyState
            icon={UserX}
            title={hasFilters ? "Nenhum resultado encontrado" : "Nenhum desligamento registrado"}
            description={
              hasFilters
                ? "Ajuste a busca ou os filtros para ver outros desligamentos."
                : "Quando um colaborador sair da empresa, registre aqui — os dados alimentam os KPIs de turnover em Gestão."
            }
          />
        ) : (
          <Card style={{ padding: 0 }}>
            {exits.map((exit, index) => (
              <div
                key={exit.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 24px",
                  borderTop: index === 0 ? "none" : "1px solid var(--border)",
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{exit.userName}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                    {exit.position || "Cargo não informado"}
                    {exit.department ? ` · ${exit.department}` : ""} · Saiu em {formatDate(exit.exitDate)}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Badge tone="primary">{EXIT_REASON_LABELS[exit.reason as keyof typeof EXIT_REASON_LABELS]}</Badge>
                  <Badge tone={exit.exitType === "VOLUNTARIA" ? "success" : "primary"}>
                    {EXIT_TYPE_LABELS[exit.exitType as keyof typeof EXIT_TYPE_LABELS]}
                  </Badge>
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>
    </>
  );
}

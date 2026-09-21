import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListToolbar } from "@/components/ui/ListToolbar";
import { ColaboradorRowActions } from "@/components/colaboradores/ColaboradorRowActions";
import { Users } from "lucide-react";
import { listColaboradores } from "@/services/colaboradores";
import { listCompanyOptions } from "@/services/companyOptions";

export default async function ColaboradoresPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; status?: string; department?: string }>;
}) {
  const { q, role, status, department } = await searchParams;
  const [colaboradores, departments] = await Promise.all([
    listColaboradores({ q, role, status, department }),
    listCompanyOptions("SETOR"),
  ]);
  const hasFilters = Boolean(q || role || status || department);

  return (
    <>
      <Header title="Colaboradores" />
      <div className="fin-content">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <ListToolbar
            searchPlaceholder="Buscar por nome, e-mail ou cargo..."
            filters={[
              {
                key: "role",
                label: "Todos os perfis",
                options: [
                  { value: "ADMIN", label: "Administrador" },
                  { value: "HR", label: "RH" },
                  { value: "EMPLOYEE", label: "Colaborador" },
                ],
              },
              {
                key: "department",
                label: "Departamento",
                options: departments.map((d) => ({ value: d.label, label: d.label })),
              },
              {
                key: "status",
                label: "Status",
                options: [
                  { value: "active", label: "Ativo" },
                  { value: "inactive", label: "Inativo" },
                ],
              },
            ]}
          />
          <Link href="/colaboradores/novo">
            <Button variant="primary">Cadastrar colaborador</Button>
          </Link>
        </div>

        {colaboradores.length === 0 ? (
          <EmptyState
            icon={Users}
            title={hasFilters ? "Nenhum resultado encontrado" : "Nenhum colaborador cadastrado"}
            description={
              hasFilters
                ? "Ajuste a busca ou os filtros para ver outros colaboradores."
                : "Cadastre o primeiro colaborador da empresa para começar."
            }
          />
        ) : (
          <Card style={{ padding: 0 }}>
            {colaboradores.map((colaborador, index) => (
              <div
                key={colaborador.id}
                className="group"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 24px",
                  borderTop: index === 0 ? "none" : "1px solid var(--border)",
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{colaborador.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                    {colaborador.position || "Cargo não informado"} · {colaborador.email}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Badge tone={colaborador.role === "ADMIN" ? "primary" : "success"}>{colaborador.role}</Badge>
                  <Badge tone={colaborador.active ? "success" : "primary"}>
                    {colaborador.active ? "Ativo" : "Inativo"}
                  </Badge>
                  <ColaboradorRowActions colaboradorId={colaborador.id} name={colaborador.name} />
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>
    </>
  );
}

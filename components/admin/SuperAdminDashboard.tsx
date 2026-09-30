import Link from "next/link";
import { Building2, Handshake, ShieldCheck, Users } from "lucide-react";
import { Card } from "@/components/ui/Card";

type PlanCount = { plan: string; count: number };
type CompanyUserCount = { id: string; name: string; plan: string; userCount: number };

const PLAN_LABELS: Record<string, string> = { essencial: "Essencial", profissional: "Profissional", corporativo: "Corporativo" };
// Mesmas cores já usadas na página de Planos (azul do destaque Profissional,
// preto do Corporativo) — consistência entre as duas telas de gestão.
const PLAN_COLORS: Record<string, string> = { essencial: "var(--tertiary-label)", profissional: "var(--accent)", corporativo: "var(--label)" };

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function StatCard({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: string | number }) {
  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-muted)" }}>
        <Icon size={16} />
        <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
      </div>
      <span style={{ fontSize: 32, fontWeight: 700, color: "var(--ink)" }}>{value}</span>
    </Card>
  );
}

function PlanPieChart({ planCounts }: { planCounts: PlanCount[] }) {
  const total = planCounts.reduce((sum, p) => sum + p.count, 0);
  if (total === 0) {
    return <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Nenhuma empresa ativa ainda.</p>;
  }

  // Gradiente cônico calculado a partir das fatias — sem lib de gráfico,
  // só CSS (3 fatias no máximo, não justifica uma dependência nova).
  let acc = 0;
  const stops = planCounts.map(({ plan, count }) => {
    const start = (acc / total) * 360;
    acc += count;
    const end = (acc / total) * 360;
    return `${PLAN_COLORS[plan] ?? "var(--tertiary-label)"} ${start}deg ${end}deg`;
  });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
      <div
        style={{
          width: 140,
          height: 140,
          borderRadius: "var(--radius-full)",
          background: `conic-gradient(${stops.join(", ")})`,
          flexShrink: 0,
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {planCounts.map(({ plan, count }) => (
          <div key={plan} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <span style={{ width: 10, height: 10, borderRadius: "var(--radius-full)", background: PLAN_COLORS[plan] ?? "var(--tertiary-label)", flexShrink: 0 }} />
            <span style={{ color: "var(--ink)" }}>{PLAN_LABELS[plan] ?? plan}</span>
            <span style={{ color: "var(--text-muted)" }}>
              — {count} ({total > 0 ? Math.round((count / total) * 100) : 0}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Painel do dono do sistema — stats globais do SaaS, nunca dados de uma
// empresa específica (SUPERADMIN não pertence a nenhuma, ver lib/session.ts).
export function SuperAdminDashboard({
  totalActiveCompanies,
  planCounts,
  totalUsers,
  totalPartners,
  companiesWithUserCount,
  averageTicket,
  adminName,
  adminEmail,
}: {
  totalActiveCompanies: number;
  planCounts: PlanCount[];
  totalUsers: number;
  totalPartners: number;
  companiesWithUserCount: CompanyUserCount[];
  averageTicket: number;
  adminName: string;
  adminEmail: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
        <StatCard icon={Building2} label="Empresas ativas" value={totalActiveCompanies} />
        <StatCard icon={Users} label="Usuários" value={totalUsers} />
        <StatCard icon={Handshake} label="Parceiros" value={totalPartners} />
        <StatCard icon={Building2} label="Ticket médio" value={currency.format(averageTicket)} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        <Card style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <span className="fin-eyebrow">EMPRESAS POR PLANO</span>
          <PlanPieChart planCounts={planCounts} />
        </Card>

        <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <span className="fin-eyebrow">USUÁRIOS POR EMPRESA</span>
          {companiesWithUserCount.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Nenhuma empresa ativa ainda.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 200, overflowY: "auto" }}>
              {companiesWithUserCount.map((c) => (
                <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "var(--radius-full)", background: PLAN_COLORS[c.plan] ?? "var(--tertiary-label)", flexShrink: 0 }} />
                    <span style={{ color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
                  </div>
                  <span style={{ color: "var(--text-muted)", flexShrink: 0 }}>
                    {c.userCount} {c.userCount === 1 ? "usuário" : "usuários"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "var(--radius-full)",
            background: "var(--surface-muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <ShieldCheck size={18} style={{ color: "var(--text-muted)" }} />
        </div>
        <div>
          <span className="fin-eyebrow">ADMINISTRADOR DO SISTEMA</span>
          <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>{adminName}</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{adminEmail}</div>
        </div>
      </Card>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link href="/admin/empresas" className="fin-btn fin-btn--secondary" style={{ textDecoration: "none" }}>
          Gerenciar Empresas
        </Link>
        <Link href="/admin/parceiros" className="fin-btn fin-btn--secondary" style={{ textDecoration: "none" }}>
          Gerenciar Parceiros
        </Link>
      </div>
    </div>
  );
}

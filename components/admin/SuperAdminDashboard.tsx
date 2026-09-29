import Link from "next/link";
import { Building2, Briefcase, Handshake, Users } from "lucide-react";
import { Card } from "@/components/ui/Card";

function StatCard({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: number }) {
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

// Painel do dono do sistema — stats globais do SaaS, nunca dados de uma
// empresa específica (SUPERADMIN não pertence a nenhuma, ver lib/session.ts).
export function SuperAdminDashboard({
  totalCompanies,
  totalUsers,
  totalApplications,
  totalActiveJobs,
}: {
  totalCompanies: number;
  totalUsers: number;
  totalApplications: number;
  totalActiveJobs: number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
        <StatCard icon={Building2} label="Empresas ativas" value={totalCompanies} />
        <StatCard icon={Users} label="Usuários" value={totalUsers} />
        <StatCard icon={Briefcase} label="Vagas abertas" value={totalActiveJobs} />
        <StatCard icon={Handshake} label="Candidaturas" value={totalApplications} />
      </div>

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

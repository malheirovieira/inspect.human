"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Company } from "@prisma/client";
import { Building2, Briefcase, Users } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { updateCompanyPlan, toggleCompanyActive } from "@/app/actions/adminCompanies";

type CompanyWithCounts = Company & { _count: { users: number; jobs: number; applications: number } };

const PLAN_LABELS: Record<string, string> = { essencial: "Essencial", profissional: "Profissional", corporativo: "Corporativo" };

export function CompaniesList({ companies }: { companies: CompanyWithCounts[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handlePlanChange(companyId: string, plan: string) {
    setLoadingId(companyId);
    await updateCompanyPlan(companyId, plan);
    setLoadingId(null);
    router.refresh();
  }

  async function handleToggle(companyId: string) {
    setLoadingId(companyId);
    await toggleCompanyActive(companyId);
    setLoadingId(null);
    router.refresh();
  }

  if (companies.length === 0) {
    return <EmptyState icon={Building2} title="Nenhuma empresa cadastrada" description='Clique em "Nova Empresa" para cadastrar seu primeiro cliente.' />;
  }

  return (
    <Card style={{ padding: 0 }}>
      {companies.map((company, index) => (
        <div
          key={company.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "16px 20px",
            borderTop: index === 0 ? "none" : "1px solid var(--border)",
            opacity: company.active ? 1 : 0.55,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "var(--radius-md)",
              background: "var(--surface-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Building2 size={18} style={{ color: "var(--text-muted)" }} />
          </div>

          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>{company.name}</span>
              {!company.active && <Badge tone="danger">Inativa</Badge>}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>/{company.slug}</div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 13, color: "var(--text-muted)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Users size={14} /> {company._count.users}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Briefcase size={14} /> {company._count.jobs}
            </span>
          </div>

          <Select
            value={company.plan}
            onChange={(e) => handlePlanChange(company.id, e.target.value)}
            disabled={loadingId === company.id}
            style={{ width: 150 }}
          >
            {Object.entries(PLAN_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>

          <Button type="button" variant="secondary" onClick={() => handleToggle(company.id)} disabled={loadingId === company.id}>
            {company.active ? "Desativar" : "Ativar"}
          </Button>
        </div>
      ))}
    </Card>
  );
}

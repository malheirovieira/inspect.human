import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { CompaniesList } from "@/components/admin/CompaniesList";
import { NewCompanySection } from "@/components/admin/NewCompanySection";
import { listAllCompanies } from "@/app/actions/adminCompanies";

export default async function AdminEmpresasPage() {
  const companies = await listAllCompanies();

  return (
    <>
      <Header title="Empresas" breadcrumb={[{ label: "Admin" }, { label: "Empresas" }]} />
      <div className="fin-content">
        <Card style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span className="fin-eyebrow">CLIENTES CADASTRADOS</span>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
            {companies.length} {companies.length === 1 ? "empresa cadastrada" : "empresas cadastradas"}
          </p>
        </Card>

        <NewCompanySection />

        <CompaniesList companies={companies} />
      </div>
    </>
  );
}

export const metadata = {
  title: "Empresas - Inspect Talent",
};

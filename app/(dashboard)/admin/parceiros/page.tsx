import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { PartnersList } from "@/components/admin/PartnersList";
import { NewPartnerSection } from "@/components/admin/NewPartnerSection";
import { listPartners } from "@/app/actions/partners";

// Só SUPERADMIN chega aqui — listPartners() já bloqueia (requireRole,
// redirect embutido em requireSession) quem não for.
export default async function AdminParceirosPage() {
  const partners = await listPartners();

  return (
    <>
      <Header
        title="Parceiros"
        breadcrumb={[{ label: "Admin" }, { label: "Parceiros" }]}
      />
      <div className="fin-content">
        <Card style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span className="fin-eyebrow">BANNERS DE PARCEIROS</span>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
            Exibidos na tela de Início para todos os usuários. Planos gratuitos não podem fechar os banners.
          </p>
        </Card>

        <NewPartnerSection />

        <PartnersList partners={partners} />
      </div>
    </>
  );
}

export const metadata = {
  title: "Parceiros - Inspect Talent",
};

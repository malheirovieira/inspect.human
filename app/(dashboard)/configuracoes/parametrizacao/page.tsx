import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { JobBoardIntegrationsForm } from "@/components/configuracoes/JobBoardIntegrationsForm";
import { getCompany } from "@/services/company";
import { requireRole } from "@/lib/session";

export default async function ParametrizacaoPage() {
  const session = await requireRole(["ADMIN"]);
  const company = await getCompany(session.companyId);

  return (
    <>
      <Header
        title="Parametrização"
        backHref="/configuracoes"
        breadcrumb={[{ label: "Configurações", href: "/configuracoes" }, { label: "Parametrização" }]}
      />
      <div className="fin-content">
        <div>
          <span className="fin-eyebrow">INTEGRAÇÕES DE DIVULGAÇÃO DE VAGAS</span>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 12px" }}>
            Dados cadastrados uma vez pra empresa inteira. A escolha de onde cada vaga é
            divulgada fica no cadastro da própria vaga.
          </p>
        </div>

        <JobBoardIntegrationsForm
          initial={{
            indeedEmployerEmail: company?.indeedEmployerEmail ?? "",
            linkedinCompanyId: company?.linkedinCompanyId ?? "",
            infojobsId: company?.infojobsId ?? "",
          }}
          linkedinLive={process.env.LINKEDIN_INTEGRATION_LIVE === "true"}
          infojobsLive={process.env.INFOJOBS_INTEGRATION_LIVE === "true"}
        />

        <div>
          <span className="fin-eyebrow">OUTRAS PARAMETRIZAÇÕES</span>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 12px" }}>
            Espaço reservado para configurações do sistema sem relação com divulgação
            externa.
          </p>
        </div>
        <Card style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div className="fin-heading" style={{ marginBottom: 0 }}>
            Parametrizações do sistema
          </div>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
            Nenhuma configuração aqui ainda — esta seção vai crescer com o tempo.
          </p>
        </Card>
      </div>
    </>
  );
}

export const metadata = {
  title: "Parametrização - Inspect Talent",
};

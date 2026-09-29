import { Header } from "@/components/layout/Header";
import { TestimonialsStrip } from "@/components/inicio/TestimonialsStrip";
import { PartnersCarousel } from "@/components/inicio/PartnersCarousel";
import { SuperAdminDashboard } from "@/components/admin/SuperAdminDashboard";
import { requireSession } from "@/lib/session";
import { TESTIMONIALS } from "@/lib/testimonials";
import { listActivePartners } from "@/app/actions/partners";
import { getCompanyPlan } from "@/services/plans";
import { DEFAULT_PLAN_ID } from "@/lib/plans";
import { prisma } from "@/lib/prisma";

function formatHeaderDate(date: Date): string {
  const dayMonth = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long" }).format(date);
  return `${dayMonth}, ${date.getFullYear()}`;
}

// Pouso fixo pós-login (sempre aqui, nunca no último módulo visitado — ver
// Sidebar.tsx: fica fora de GROUPS, por isso nenhuma seção do menu acende
// quando o usuário está nesta página). O fundo ambiente vem do layout
// (components/layout/AmbientBackground).
//
// SUPERADMIN não tem empresa (companyId null) — não faz sentido mostrar
// depoimentos/parceiros de uma empresa específica pra quem não pertence a
// nenhuma; em vez disso vê stats globais do SaaS (SuperAdminDashboard).
//
// Título = saudação neutra (serve pra qualquer gênero) com o primeiro nome;
// o item do menu ("Início"), a aba do navegador e o rótulo acima do título
// continuam iguais. Abaixo, a faixa de depoimentos FICTÍCIOS
// (lib/testimonials.ts) — só ADMIN e HR; EMPLOYEE vê só o título.
//
// "Precisa da sua atenção" saiu da tela, mas a lógica continua pronta pra
// uso futuro em outro lugar: services/attention.ts + AttentionCard.
export default async function InicioPage() {
  const session = await requireSession();
  const firstName = session.name.trim().split(/\s+/)[0] ?? "";
  const header = (
    <Header
      title={firstName ? `Que bom ter você de volta, ${firstName}` : "Que bom ter você de volta"}
      date={formatHeaderDate(new Date())}
    />
  );

  if (session.role === "SUPERADMIN") {
    const [totalCompanies, totalUsers, totalApplications, totalActiveJobs] = await prisma.$transaction([
      prisma.company.count({ where: { active: true } }),
      prisma.user.count({ where: { role: { not: "SUPERADMIN" } } }),
      prisma.application.count(),
      prisma.job.count({ where: { status: "OPEN" } }),
    ]);

    return (
      <>
        {header}
        <div className="fin-content">
          <SuperAdminDashboard
            totalCompanies={totalCompanies}
            totalUsers={totalUsers}
            totalApplications={totalApplications}
            totalActiveJobs={totalActiveJobs}
          />
        </div>
      </>
    );
  }

  // ADMIN/HR/EMPLOYEE sempre têm companyId — defensivo, não deveria disparar.
  if (!session.companyId) return header;
  const { companyId } = session;

  // Parceiros aparecem pra TODOS os usuários da empresa (inclusive EMPLOYEE,
  // que antes só via o título) — só o carrossel de depoimentos continua
  // exclusivo de ADMIN/HR.
  const [partners, plan] = await Promise.all([listActivePartners(), getCompanyPlan(companyId)]);
  const canClose = plan.id !== DEFAULT_PLAN_ID;
  const showTestimonials = session.role === "ADMIN" || session.role === "HR";

  if (!showTestimonials && partners.length === 0) return header;

  return (
    <>
      {header}
      <div className="fin-content">
        {showTestimonials && <TestimonialsStrip items={[...TESTIMONIALS]} />}
        {partners.length > 0 && (
          <div style={{ marginTop: "auto", paddingBottom: 24 }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text-muted)", margin: "0 0 16px" }}>
              Parceiros de benefícios
            </p>
            <PartnersCarousel partners={partners} canClose={canClose} />
          </div>
        )}
      </div>
    </>
  );
}

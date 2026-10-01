import { Header } from "@/components/layout/Header";
import { PartnersCarousel } from "@/components/inicio/PartnersCarousel";
import { SuperAdminDashboard } from "@/components/admin/SuperAdminDashboard";
import { requireSession } from "@/lib/session";
import { listActivePartners } from "@/app/actions/partners";
import { getCompanyPlan } from "@/services/plans";
import { DEFAULT_PLAN_ID, PLANS } from "@/lib/plans";
import { prisma } from "@/lib/prisma";

// Pouso fixo pós-login (sempre aqui, nunca no último módulo visitado — ver
// Sidebar.tsx: fica fora de GROUPS, por isso nenhuma seção do menu acende
// quando o usuário está nesta página). O fundo ambiente vem do layout
// (components/layout/AmbientBackground).
//
// SUPERADMIN não tem empresa (companyId null) — não faz sentido mostrar
// parceiros de uma empresa específica pra quem não pertence a nenhuma; em
// vez disso vê stats globais do SaaS (SuperAdminDashboard).
//
// Título = saudação neutra (serve pra qualquer gênero) com o primeiro nome;
// o item do menu ("Início"), a aba do navegador e o rótulo acima do título
// continuam iguais.
//
// "Precisa da sua atenção" saiu da tela, mas a lógica continua pronta pra
// uso futuro em outro lugar: services/attention.ts + AttentionCard.
export default async function InicioPage() {
  const session = await requireSession();
  const firstName = session.name.trim().split(/\s+/)[0] ?? "";
  const header = (
    <Header
      title={firstName ? `Que bom ter você de volta, ${firstName}` : "Que bom ter você de volta"}
    />
  );

  if (session.role === "SUPERADMIN") {
    // groupBy fora do $transaction([...]) — dentro de um array heterogêneo
    // o TypeScript perde a inferência específica de _count e trata como
    // `true | {...} | undefined` genérico; isoladas, todas são leituras
    // (sem necessidade real de atomicidade entre si).
    const [totalUsers, totalPartners, companiesWithUserCount] = await prisma.$transaction([
      prisma.user.count({ where: { role: { not: "SUPERADMIN" } } }),
      prisma.partner.count(),
      prisma.company.findMany({
        where: { active: true },
        select: { id: true, name: true, plan: true, _count: { select: { users: true } } },
        orderBy: { name: "asc" },
      }),
    ]);
    const planCounts = await prisma.company.groupBy({
      by: ["plan"],
      where: { active: true },
      _count: { _all: true },
      orderBy: { plan: "asc" },
    });

    const totalActiveCompanies = planCounts.reduce((sum, p) => sum + p._count._all, 0);

    // Ticket médio = receita mensal estimada (soma do preço do plano de cada
    // empresa ativa) / número de empresas ativas. Corporativo é "sob
    // consulta" (monthlyPrice: null em lib/plans.ts) — não entra na conta,
    // nem no numerador nem no denominador, por não ter valor conhecido.
    let revenueSum = 0;
    let payingCompanies = 0;
    for (const { plan, _count } of planCounts) {
      const price = PLANS.find((p) => p.id === plan)?.monthlyPrice;
      if (price != null) {
        revenueSum += price * _count._all;
        payingCompanies += _count._all;
      }
    }
    const averageTicket = payingCompanies > 0 ? revenueSum / payingCompanies : 0;

    return (
      <>
        {header}
        <div className="fin-content">
          <SuperAdminDashboard
            totalActiveCompanies={totalActiveCompanies}
            planCounts={planCounts.map((p) => ({ plan: p.plan, count: p._count._all }))}
            totalUsers={totalUsers}
            totalPartners={totalPartners}
            companiesWithUserCount={companiesWithUserCount.map((c) => ({ id: c.id, name: c.name, plan: c.plan, userCount: c._count.users }))}
            averageTicket={averageTicket}
            adminName={session.name}
            adminEmail={session.email}
          />
        </div>
      </>
    );
  }

  // ADMIN/HR/EMPLOYEE sempre têm companyId — defensivo, não deveria disparar.
  if (!session.companyId) return header;
  const { companyId } = session;

  // Parceiros aparecem pra TODOS os usuários da empresa (inclusive EMPLOYEE).
  const [partners, plan] = await Promise.all([listActivePartners(), getCompanyPlan(companyId)]);
  const canClose = plan.id !== DEFAULT_PLAN_ID;

  if (partners.length === 0) return header;

  return (
    <>
      {header}
      <div className="fin-content">
        <div style={{ marginTop: "auto", paddingBottom: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text-muted)", margin: "0 0 16px" }}>
            Parceiros de benefícios
          </p>
          <PartnersCarousel partners={partners} canClose={canClose} />
        </div>
      </div>
    </>
  );
}

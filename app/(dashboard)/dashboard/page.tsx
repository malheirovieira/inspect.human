import { PartnersCarousel } from "@/components/inicio/PartnersCarousel";
import { SuperAdminDashboard } from "@/components/admin/SuperAdminDashboard";
import { requireSession } from "@/lib/session";
import { listActivePartners } from "@/app/actions/partners";
import { getCompanyPlan } from "@/services/plans";
import { DEFAULT_PLAN_ID, PLANS } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { getCompany } from "@/services/company";
import { InicioLayout } from "@/components/inicio/InicioLayout";

// Pouso fixo pós-login (sempre aqui, nunca no último módulo visitado).
//
// SUPERADMIN não tem empresa (companyId null) — não faz sentido mostrar
// parceiros de uma empresa específica pra quem não pertence a nenhuma; em
// vez disso vê stats globais do SaaS (SuperAdminDashboard).
//
// Cabeçalho no estilo da referência do menu lateral (2026-10-02): data,
// saudação por horário (neutra — serve pra qualquer gênero) e uma linha de
// apoio; faixa "Visão ativa" no rodapé da área.
//
// "Precisa da sua atenção" saiu da tela, mas a lógica continua pronta pra
// uso futuro em outro lugar: services/attention.ts + AttentionCard.

export default async function InicioPage() {
  const session = await requireSession();
  const firstName = session.name.trim().split(/\s+/)[0] ?? "";

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
      <InicioLayout firstName={firstName} companyName={null}>
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
      </InicioLayout>
    );
  }

  // ADMIN/HR/EMPLOYEE sempre têm companyId — defensivo, não deveria disparar.
  if (!session.companyId) return <InicioLayout firstName={firstName} companyName={null} />;
  const { companyId } = session;

  // Parceiros aparecem pra TODOS os usuários da empresa (inclusive EMPLOYEE).
  const [partners, plan, company] = await Promise.all([listActivePartners(), getCompanyPlan(companyId), getCompany(companyId)]);
  const canClose = plan.id !== DEFAULT_PLAN_ID;
  const companyName = company?.name ?? null;

  if (partners.length === 0) return <InicioLayout firstName={firstName} companyName={companyName} />;

  return (
    <InicioLayout firstName={firstName} companyName={companyName}>
      <div>
        <p className="mb-4 text-[10px] uppercase tracking-[0.16em] text-neutral-500">Parceiros de benefícios</p>
        <PartnersCarousel partners={partners} canClose={canClose} />
      </div>
    </InicioLayout>
  );
}

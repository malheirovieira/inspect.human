import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { PageTransition } from "@/components/layout/PageTransition";
import { AmbientBackground } from "@/components/layout/AmbientBackground";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export default async function DashboardGroupLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  // Conta criada com senha temporária (inviteUser/createColaborador) —
  // bloqueia todo o dashboard até trocar a senha. /trocar-senha fica fora
  // deste grupo de rotas (como /login), então não entra nesse redirect.
  if (session.mustChangePassword) redirect("/trocar-senha");

  const company = await prisma.company.findUnique({ where: { id: session.companyId } });

  return (
    <div className="fin-app">
      {/* Primeira camada: fundo ambiente, só renderiza na tela Início. */}
      <AmbientBackground />
      <Sidebar userName={session.name} companyName={company?.name} />
      <div className="fin-main">
        <PageTransition>{children}</PageTransition>
      </div>
    </div>
  );
}

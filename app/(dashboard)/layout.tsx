import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { PageTransition } from "@/components/layout/PageTransition";
import { AmbientBackground } from "@/components/layout/AmbientBackground";
import { requireSession } from "@/lib/session";
import { getCompany } from "@/services/company";

export default async function DashboardGroupLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  // Conta criada com senha temporária (inviteUser/createColaborador) —
  // bloqueia todo o dashboard até trocar a senha. /trocar-senha fica fora
  // deste grupo de rotas (como /login), então não entra nesse redirect.
  if (session.mustChangePassword) redirect("/trocar-senha");

  // SUPERADMIN não tem empresa (companyId null) — mostra rótulo do sistema
  // no lugar do nome de uma empresa que ele não pertence mais.
  const company = session.companyId ? await getCompany(session.companyId) : null;
  const companyName = session.role === "SUPERADMIN" ? "Painel do Sistema" : company?.name;

  return (
    <div className="fin-app">
      <Sidebar userName={session.name} companyName={companyName} role={session.role} />
      <div className="fin-main">
        {/* Primeira camada da ÁREA DA PÁGINA (a Sidebar é branca e fica de
            fora): fundo ambiente, só renderiza na tela Início. */}
        <AmbientBackground />
        <PageTransition>{children}</PageTransition>
      </div>
    </div>
  );
}

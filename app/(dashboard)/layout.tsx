import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/Sidebar";
import { PageTransition } from "@/components/layout/PageTransition";
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
  const companyName = session.role === "SUPERADMIN" ? "Painel do Sistema" : (company?.name ?? "Sua empresa");

  return (
    <AppShell userName={session.name} userEmail={session.email} companyName={companyName} role={session.role}>
      <PageTransition>{children}</PageTransition>
    </AppShell>
  );
}

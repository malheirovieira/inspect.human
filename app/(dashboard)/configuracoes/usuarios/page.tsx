import { Header } from "@/components/layout/Header";
import { InviteUserForm } from "@/components/configuracoes/InviteUserForm";
import { requireRole } from "@/lib/session";

export default async function UsuariosPage() {
  // Só ADMIN — acesso direto por HR/EMPLOYEE volta pro dashboard.
  await requireRole(["ADMIN"]);

  return (
    <>
      <Header
        title="Usuários"
        backHref="/configuracoes"
        breadcrumb={[{ label: "Configurações", href: "/configuracoes" }, { label: "Usuários" }]}
      />
      <div className="fin-content">
        <InviteUserForm />
      </div>
    </>
  );
}

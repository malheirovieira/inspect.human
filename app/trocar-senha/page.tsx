import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import { AuthShell } from "@/components/layout/AuthShell";
import { TrocarSenhaForm } from "@/components/auth/TrocarSenhaForm";

const BULLETS = [
  "Sua senha temporária só funciona uma vez",
  "Escolha uma senha só sua antes de continuar",
];

export default async function TrocarSenhaPage() {
  const session = await requireSession();

  // Já trocou a senha — não há motivo pra estar aqui.
  if (!session.mustChangePassword) redirect("/dashboard");

  return (
    <AuthShell title="Quase lá." bullets={BULLETS}>
      <TrocarSenhaForm />
    </AuthShell>
  );
}

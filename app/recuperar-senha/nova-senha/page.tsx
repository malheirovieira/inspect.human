import { requireSession } from "@/lib/session";
import { AuthShell } from "@/components/layout/AuthShell";
import { NovaSenhaForm } from "@/components/auth/NovaSenhaForm";

const BULLETS = [
  "Escolha uma senha com pelo menos 8 caracteres",
  "Depois de salvar, você faz login de novo com a senha nova",
];

// Só chega aqui com sessão válida — app/auth/callback/route.ts já trocou o
// código do link de recuperação por sessão antes de redirecionar pra cá.
// requireSession() manda pro /login sozinho se não houver sessão (link
// inválido/expirado que por algum motivo não caiu no callback com erro).
export default async function NovaSenhaPage() {
  await requireSession();

  return (
    <AuthShell title="Defina sua nova senha." bullets={BULLETS}>
      <NovaSenhaForm />
    </AuthShell>
  );
}

export const metadata = {
  title: "Definir nova senha - Inspect Talent",
};

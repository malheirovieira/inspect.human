"use server";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ActionResult = { error: string } | { success: true };

// Troca a senha da conta logada (via cliente ligado à sessão/cookies
// atuais — não precisa de service_role, o próprio usuário já está
// autenticado) e desliga o flag que força essa troca.
export async function changePassword(newPassword: string): Promise<ActionResult> {
  const session = await requireSession();

  if (newPassword.length < 8) {
    return { error: "A nova senha precisa ter pelo menos 8 caracteres." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    return { error: "Não foi possível trocar a senha. Tente novamente." };
  }

  await prisma.user.update({
    where: { id: session.userId },
    data: { mustChangePassword: false },
  });

  return { success: true };
}

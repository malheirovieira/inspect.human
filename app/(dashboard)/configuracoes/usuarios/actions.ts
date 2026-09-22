"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { generateTemporaryPassword } from "@/lib/tempPassword";
import { inviteUserSchema, type InviteUserInput } from "@/schemas/userInvite";

export type InviteUserResult = { error: string } | { success: true; email: string; temporaryPassword: string };

// Convite leve: cria acesso (Auth + linha em public.users) só com
// nome/e-mail/role, sem exigir a ficha completa de RH — diferente de
// createColaborador (app/(dashboard)/colaboradores/actions.ts), que também
// cria o acesso mas junto com toda a ficha (CPF, endereço, admissão etc.).
// Os campos de ficha ficam null aqui e podem ser preenchidos depois em
// Colaboradores > editar.
export async function inviteUser(input: InviteUserInput): Promise<InviteUserResult> {
  const session = await requireRole(["ADMIN"]);

  const parsed = inviteUserSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;

  const existing = await prisma.user.findFirst({
    where: { companyId: session.companyId, email: data.email },
  });
  if (existing) {
    return { error: "Já existe um usuário com este e-mail nesta empresa." };
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const temporaryPassword = generateTemporaryPassword();

  // email_confirm: true — sem SMTP configurado ainda, então o acesso já
  // nasce confirmado (mesmo padrão de app/api/public/signup e
  // createColaborador). Nenhum e-mail é enviado: a senha é só exibida na
  // tela, uma vez, pro ADMIN repassar manualmente.
  const { data: created, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: data.email,
    password: temporaryPassword,
    email_confirm: true,
  });

  if (authError || !created.user) {
    const message = authError?.message?.includes("already been registered")
      ? "Este e-mail já está cadastrado no sistema de autenticação."
      : (authError?.message ?? "Não foi possível criar o acesso.");
    return { error: message };
  }

  try {
    await prisma.user.create({
      data: {
        id: created.user.id,
        companyId: session.companyId,
        name: data.name,
        email: data.email,
        role: data.role,
        active: true,
        mustChangePassword: true,
      },
    });
  } catch {
    // compensa a criação no Auth pra não deixar login órfão sem usuário
    await supabaseAdmin.auth.admin.deleteUser(created.user.id).catch(() => {});
    return { error: "Não foi possível salvar o usuário. Tente novamente." };
  }

  return { success: true, email: data.email, temporaryPassword };
}

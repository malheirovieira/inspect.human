"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendEmailViaResend } from "@/lib/email";

const VALID_PLANS = ["essencial", "profissional", "corporativo"];

type ActionResult = { success: true } | { success: false; error: string };

// Só SUPERADMIN — todas as empresas do sistema, com contadores básicos.
export async function listAllCompanies() {
  await requireRole(["SUPERADMIN"]);

  return prisma.company.findMany({
    include: {
      _count: { select: { users: true, jobs: true, applications: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

// Cria empresa + primeiro ADMIN atomicamente, com rollback se a criação do
// User falhar depois do Auth já ter sido criado — mesmo padrão do cadastro
// público (app/api/public/signup/route.ts).
export async function createCompanyWithAdmin(data: {
  companyName: string;
  companySlug: string;
  adminName: string;
  adminEmail: string;
  plan: string;
}): Promise<ActionResult & { tempPassword?: string }> {
  try {
    await requireRole(["SUPERADMIN"]);

    const companyName = data.companyName.trim();
    const companySlug = data.companySlug.trim().toLowerCase();
    const adminName = data.adminName.trim();
    const adminEmail = data.adminEmail.trim().toLowerCase();

    if (!companyName) return { success: false, error: "Nome da empresa obrigatório" };
    if (!companySlug) return { success: false, error: "Slug obrigatório" };
    if (!adminName) return { success: false, error: "Nome do admin obrigatório" };
    if (!adminEmail) return { success: false, error: "E-mail do admin obrigatório" };
    if (!VALID_PLANS.includes(data.plan)) return { success: false, error: "Plano inválido" };

    const slugExists = await prisma.company.findUnique({ where: { slug: companySlug } });
    if (slugExists) return { success: false, error: "Slug já existe — escolha outro" };

    // E-mail é único POR EMPRESA no schema (@@unique([companyId, email])),
    // mas o Supabase Auth é global — é lá que a colisão real acontece.
    const supabase = createSupabaseAdminClient();
    const tempPassword = randomBytes(8).toString("hex");

    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: tempPassword,
      email_confirm: true,
    });
    if (authError || !authUser.user) {
      return { success: false, error: authError?.message ?? "Erro ao criar usuário" };
    }

    try {
      const company = await prisma.company.create({
        data: { name: companyName, slug: companySlug, plan: data.plan, active: true },
      });

      await prisma.user.create({
        data: {
          id: authUser.user.id,
          name: adminName,
          email: adminEmail,
          companyId: company.id,
          role: "ADMIN",
          mustChangePassword: true,
        },
      });

      try {
        await sendEmailViaResend(
          adminEmail,
          "Seu acesso ao Inspect Talent está pronto",
          `<div style="font-family: Arial, sans-serif; max-width: 600px;">
            <h2>Olá, ${adminName}!</h2>
            <p>Sua conta no <strong>Inspect Talent</strong> foi criada com sucesso.</p>
            <div style="background: #f5f5f7; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p><strong>E-mail:</strong> ${adminEmail}</p>
              <p><strong>Senha temporária:</strong> ${tempPassword}</p>
            </div>
            <p>Você será solicitado a trocar a senha no primeiro acesso.</p>
          </div>`
        );
      } catch (emailErr) {
        // Conta já existe e funciona — falha de e-mail não desfaz a criação,
        // só significa que o SUPERADMIN precisa repassar a senha manualmente.
        console.error("[createCompanyWithAdmin] email", emailErr);
      }

      revalidatePath("/admin/empresas");
      return { success: true, tempPassword };
    } catch (err) {
      await supabase.auth.admin.deleteUser(authUser.user.id);
      throw err;
    }
  } catch (err) {
    console.error("[createCompanyWithAdmin]", err);
    return { success: false, error: "Erro ao criar empresa" };
  }
}

export async function updateCompanyPlan(companyId: string, plan: string): Promise<ActionResult> {
  try {
    await requireRole(["SUPERADMIN"]);
    if (!VALID_PLANS.includes(plan)) return { success: false, error: "Plano inválido" };

    await prisma.company.update({ where: { id: companyId }, data: { plan } });
    revalidatePath("/admin/empresas");
    return { success: true };
  } catch (err) {
    console.error("[updateCompanyPlan]", err);
    return { success: false, error: "Erro ao atualizar plano" };
  }
}

export async function toggleCompanyActive(companyId: string): Promise<ActionResult> {
  try {
    await requireRole(["SUPERADMIN"]);

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) return { success: false, error: "Empresa não encontrada" };

    await prisma.company.update({ where: { id: companyId }, data: { active: !company.active } });
    revalidatePath("/admin/empresas");
    return { success: true };
  } catch (err) {
    console.error("[toggleCompanyActive]", err);
    return { success: false, error: "Erro ao atualizar empresa" };
  }
}

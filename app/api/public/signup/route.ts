import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";

// Cria um novo tenant (company) + o primeiro usuário ADMIN. Rota pública,
// mas o "company_id" nunca é aceito do cliente: é sempre gerado aqui a
// partir de um novo registro em `companies`, e o usuário criado no Supabase
// Auth (service_role) é quem define o id de `public.users` — nada disso
// vem do corpo da requisição além do texto puro (nome/e-mail/senha).
function slugify(input: string) {
  const base = input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "")
    .slice(0, 60);
  return base || "empresa";
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  const companyName = typeof body?.companyName === "string" ? body.companyName.trim() : "";
  const adminName = typeof body?.adminName === "string" ? body.adminName.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!companyName || !adminName || !email || !password) {
    return NextResponse.json({ error: "Preencha todos os campos." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "A senha precisa ter pelo menos 8 caracteres." }, { status: 400 });
  }

  const baseSlug = slugify(companyName);
  let slug = baseSlug;
  for (let attempt = 0; attempt < 5; attempt++) {
    const existing = await prisma.company.findUnique({ where: { slug } });
    if (!existing) break;
    slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const supabaseAdmin = createSupabaseAdminClient();

  // MVP: sem SMTP configurado, então confirmamos o e-mail automaticamente.
  // Antes de ir para produção de verdade, trocar por email_confirm: false
  // + fluxo de confirmação por e-mail.
  const { data: created, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !created.user) {
    const message = authError?.message?.includes("already been registered")
      ? "Este e-mail já está cadastrado."
      : "Não foi possível criar sua conta. Tente novamente.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const company = await prisma.company.create({ data: { name: companyName, slug } });
    await prisma.user.create({
      data: {
        id: created.user.id,
        companyId: company.id,
        name: adminName,
        email,
        role: "ADMIN",
        active: true,
      },
    });
  } catch {
    // compensa a criação no Auth para não deixar usuário órfão sem empresa
    await supabaseAdmin.auth.admin.deleteUser(created.user.id).catch(() => {});
    return NextResponse.json({ error: "Não foi possível criar a empresa. Tente novamente." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

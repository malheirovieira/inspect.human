// Script único de bootstrap: cria a primeira empresa + o primeiro usuário
// ADMIN (Auth + tabela public.users). Uso local, não faz parte do runtime
// da aplicação. Rodar com: node scripts/seed-admin.js
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const { createClient } = require("@supabase/supabase-js");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const COMPANY_NAME = process.env.SEED_COMPANY_NAME || "Minha Empresa";
const COMPANY_SLUG = process.env.SEED_COMPANY_SLUG || "minha-empresa";
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;
const ADMIN_NAME = process.env.SEED_ADMIN_NAME || "admin";

async function main() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error(
      "Defina SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD no .env.local antes de rodar este script."
    );
  }

  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
  });

  if (error) {
    throw new Error(`Falha ao criar usuário no Supabase Auth: ${error.message}`);
  }

  const authUserId = created.user.id;

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const company = await prisma.company.upsert({
    where: { slug: COMPANY_SLUG },
    update: {},
    create: { name: COMPANY_NAME, slug: COMPANY_SLUG },
  });

  const user = await prisma.user.create({
    data: {
      id: authUserId,
      companyId: company.id,
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      role: "ADMIN",
      active: true,
    },
  });

  console.log("Empresa criada:", company.id, company.name);
  console.log("Usuário ADMIN criado:", user.id, user.email);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

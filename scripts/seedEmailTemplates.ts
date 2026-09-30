// Cria os templates de e-mail essenciais ("Convite Entrevista", "Link
// Entrevista") pra TODA empresa que ainda não tiver — idempotente (upsert
// por [companyId, name]). Antes, esses templates eram só inseridos direto
// no banco numa sessão de trabalho, sem versionamento — quando o projeto
// Supabase foi recriado, sumiram junto. Agora existem como código: um
// `npx tsx scripts/seedEmailTemplates.ts` restaura os dois em qualquer
// ambiente novo. Uso: npx tsx scripts/seedEmailTemplates.ts
import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const TEMPLATES = [
  {
    name: "Convite Entrevista",
    subject: "Você foi selecionado para uma entrevista!",
    bodyHtml: `<p>Olá {{candidateName}},</p>
<p>Boas notícias! Você foi selecionado(a) para uma entrevista.</p>
<p><strong>Data e Hora:</strong> {{interviewDate}} às {{interviewTime}}</p>
<p>Em breve você receberá mais detalhes (local ou link de acesso).</p>
<p>Qualquer dúvida, entre em contato!</p>`,
  },
  {
    name: "Link Entrevista",
    subject: "Aqui está o link para sua entrevista",
    bodyHtml: `<p>Olá {{candidateName}},</p>
<p>Tudo pronto para sua entrevista!</p>
<p><strong>Data e Hora:</strong> {{interviewDate}} às {{interviewTime}}</p>
<p><strong>Link da Entrevista:</strong></p>
<p><a href="{{interviewLink}}" style="color: #177f0f; font-weight: bold;">Clique aqui para acessar</a></p>
<p>Se não conseguir acessar, copie este link: {{interviewLink}}</p>
<p>Qualquer dúvida, entre em contato!</p>`,
  },
];

async function main() {
  const { PrismaClient } = await import("@prisma/client");
  const { PrismaPg } = await import("@prisma/adapter-pg");

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const companies = await prisma.company.findMany({ select: { id: true, name: true } });

  for (const company of companies) {
    for (const t of TEMPLATES) {
      const result = await prisma.emailTemplate.upsert({
        where: { companyId_name: { companyId: company.id, name: t.name } },
        update: {},
        create: { companyId: company.id, name: t.name, subject: t.subject, bodyHtml: t.bodyHtml },
      });
      console.log(`[seed-email-templates] ${company.name} -> "${t.name}" (${result.id})`);
    }
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

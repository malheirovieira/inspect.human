// Backfill: as categorias de budget deixaram de ser um enum fixo e viraram
// CompanyOption (categoria "CATEGORIA_BUDGET"), gerenciável em Configurações.
// Este script garante que toda empresa existente tenha as categorias que já
// tinha antes (Treinamento, Confraternizações) e adiciona Benefícios.
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const CATEGORIES = ["Treinamento", "Confraternizações", "Benefícios"];

async function main() {
  const companies = await prisma.company.findMany({ select: { id: true, name: true } });

  for (const company of companies) {
    for (const label of CATEGORIES) {
      const existing = await prisma.companyOption.findFirst({
        where: { companyId: company.id, category: "CATEGORIA_BUDGET", label },
      });
      if (existing) {
        if (!existing.active) {
          await prisma.companyOption.update({ where: { id: existing.id }, data: { active: true } });
          console.log(`Reativada "${label}" em ${company.name}`);
        }
        continue;
      }
      await prisma.companyOption.create({ data: { companyId: company.id, category: "CATEGORIA_BUDGET", label } });
      console.log(`Criada "${label}" em ${company.name}`);
    }
  }

  console.log("Backfill concluído.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

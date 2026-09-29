// Cria o DiscAssessment padrão ("Avaliação Comportamental") com as 60
// afirmações fixas para TODA empresa que ainda não tem um. Idempotente —
// seguro rodar de novo (pula empresa que já tem assessment).
// Uso: npx tsx scripts/seedDisc.ts
import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

async function main() {
  // Import dinâmico: só depois do dotenv rodar, senão DATABASE_URL chega
  // undefined no PrismaPg (mesmo problema já visto em scripts anteriores).
  const { PrismaClient } = await import("@prisma/client");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const { DISC_QUESTIONS } = await import("../lib/disc/questions");

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const companies = await prisma.company.findMany({ select: { id: true, name: true } });

  for (const company of companies) {
    const existing = await prisma.discAssessment.findFirst({ where: { companyId: company.id } });
    if (existing) {
      console.log(`[seed-disc] ${company.name}: já tem assessment, pulando.`);
      continue;
    }

    const assessment = await prisma.discAssessment.create({
      data: {
        companyId: company.id,
        title: "Avaliação Comportamental",
        questions: {
          create: DISC_QUESTIONS.map((q) => ({
            position: q.position,
            section: q.section,
            dimension: q.dimension,
            text: q.text,
          })),
        },
      },
    });
    console.log(`[seed-disc] ${company.name}: criado assessment ${assessment.id} com ${DISC_QUESTIONS.length} perguntas.`);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

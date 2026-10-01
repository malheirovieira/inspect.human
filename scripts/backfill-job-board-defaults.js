// Backfill: Parametrização de divulgação de vagas (migration 0038). Vagas
// OPEN de empresa ativa já apareciam de fato no Google (JSON-LD) e no
// Jooble (feed) ANTES de existir o checkbox "Divulgar em" — e no Indeed
// quando a empresa já tinha indeed_employer_email preenchido. Sem este
// backfill, essas vagas "sumiriam" dos canais onde já estavam, porque o
// checkbox novo nasce desmarcado (opt-in) por padrão.
//
// Vaga criada DAQUI PRA FRENTE não entra aqui — segue opt-in normal, com
// tudo desmarcado até o recrutador escolher.
//
// Mesma condição de elegibilidade usada em services/jobs.ts
// (getPublicOpenJob) e lib/seo/jobFeed.ts: vaga status=OPEN de empresa
// active=true. Idempotente — rodar de novo não causa problema.
//
// Uso:
//   node scripts/backfill-job-board-defaults.js           # dry-run (só conta, não grava)
//   node scripts/backfill-job-board-defaults.js --apply   # roda de verdade
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const APPLY = process.argv.includes("--apply");

const ELIGIBILITY_SQL = `j.status = 'OPEN' and c.active = true`;

const UPDATE_SQL = `
update public.jobs j
set publish_google = true,
    publish_jooble = true,
    publish_indeed = (c.indeed_employer_email is not null and c.indeed_employer_email <> '')
from public.companies c
where j.company_id = c.id
  and ${ELIGIBILITY_SQL}
`.trim();

async function main() {
  console.log(APPLY ? "Modo --apply: vai gravar no banco.\n" : "Modo dry-run (nada será alterado).\n");

  const [{ count: eligibleCount }] = await prisma.$queryRawUnsafe(`
    select count(*)::int as count
    from public.jobs j
    join public.companies c on c.id = j.company_id
    where ${ELIGIBILITY_SQL}
  `);
  const [{ count: indeedCount }] = await prisma.$queryRawUnsafe(`
    select count(*)::int as count
    from public.jobs j
    join public.companies c on c.id = j.company_id
    where ${ELIGIBILITY_SQL}
      and c.indeed_employer_email is not null
      and c.indeed_employer_email <> ''
  `);

  console.log(`Vagas que vão ganhar Google + Jooble marcados: ${eligibleCount}`);
  console.log(`Dessas, quantas também ganham Indeed marcado (empresa já tinha e-mail): ${indeedCount}`);
  console.log("\nUPDATE que será executado:\n");
  console.log(UPDATE_SQL, "\n");

  if (!APPLY) {
    console.log("Nada foi alterado (dry-run). Rode com --apply para executar de verdade.");
    return;
  }

  const affected = await prisma.$executeRawUnsafe(UPDATE_SQL);
  console.log(`Linhas atualizadas: ${affected}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

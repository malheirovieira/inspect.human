// Popula o banco com dados fictícios (colaboradores, vagas, candidatos,
// opções pré-definidas) pra simular o sistema em uso. Uso local, não faz
// parte do runtime da aplicação. Rodar com: node scripts/seed-demo-data.js
//
// Pré-requisito: rode scripts/seed-admin.js antes (precisa da empresa e do
// usuário ADMIN já existirem). Seguro rodar mais de uma vez — usa e-mails
// determinísticos (colaboradorN@exemplo.com, candidatoN-M@exemplo.com) e
// pula quem já existe em vez de duplicar.
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
const crypto = require("crypto");

const { createClient } = require("@supabase/supabase-js");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const COMPANY_SLUG = process.env.SEED_COMPANY_SLUG || "minha-empresa";
const COLABORADOR_COUNT = 10;

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const FIRST_NAMES = [
  "Ana", "Bruno", "Carla", "Diego", "Elaine", "Fábio", "Gabriela", "Henrique",
  "Isabela", "João", "Karina", "Lucas", "Mariana", "Nicolas", "Otávio",
  "Patrícia", "Rafael", "Sabrina", "Thiago", "Vanessa",
];
const LAST_NAMES = [
  "Silva", "Souza", "Oliveira", "Santos", "Pereira", "Costa", "Almeida",
  "Ferreira", "Rodrigues", "Gomes", "Martins", "Araújo", "Carvalho", "Lima", "Ribeiro",
];

const DEPARTMENTS = ["Comercial", "RH", "Financeiro", "Operações", "Tecnologia"];
const WORK_SCHEDULES = ["Seg-Sex 08h-17h", "Seg-Sex 09h-18h", "Escala 12x36"];
const CONTRACT_TYPES = ["CLT", "PJ", "Estágio"];
const POSITIONS = {
  Comercial: ["Vendedor(a)", "Coordenador(a) Comercial", "SDR"],
  RH: ["Analista de RH", "Recrutador(a)"],
  Financeiro: ["Analista Financeiro", "Assistente Financeiro"],
  Operações: ["Analista de Operações", "Assistente Administrativo"],
  Tecnologia: ["Desenvolvedor(a)", "Analista de Suporte"],
};
const CANDIDATE_STAGES = ["TRIAGE", "INTERVIEW", "PROPOSAL", "HIRED"];
const CANDIDATE_TAGS = ["GREEN", "YELLOW", "BLUE", "RED", "GRAY"];
const BUDGET_CATEGORIES = ["SALARIO", "TREINAMENTO", "CONFRATERNIZACOES"];

function randomFrom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function fullName() {
  return `${randomFrom(FIRST_NAMES)} ${randomFrom(LAST_NAMES)}`;
}

function pastDate(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d;
}

function fakeCpf(seed) {
  return String(10000000000 + seed).padStart(11, "0");
}

async function seedCompanyOptions(companyId) {
  const categories = [
    ["SETOR", DEPARTMENTS],
    ["HORARIO_TRABALHO", WORK_SCHEDULES],
    ["MODALIDADE_CONTRATACAO", CONTRACT_TYPES],
  ];
  for (const [category, labels] of categories) {
    for (const label of labels) {
      await prisma.companyOption.upsert({
        where: { companyId_category_label: { companyId, category, label } },
        update: {},
        create: { companyId, category, label },
      });
    }
  }
  console.log("Opções pré-definidas: ok.");
}

async function seedColaboradores(company) {
  const colaboradores = [];
  for (let i = 1; i <= COLABORADOR_COUNT; i++) {
    const email = `colaborador${i}@exemplo.com`;
    const existing = await prisma.user.findFirst({ where: { companyId: company.id, email } });
    if (existing) {
      colaboradores.push(existing);
      continue;
    }

    const name = fullName();
    const department = randomFrom(DEPARTMENTS);
    const position = randomFrom(POSITIONS[department]);

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: crypto.randomUUID(),
      email_confirm: true,
    });
    if (error) {
      console.error(`  Falha ao criar acesso para ${email}: ${error.message}`);
      continue;
    }

    const user = await prisma.user.create({
      data: {
        id: created.user.id,
        companyId: company.id,
        name,
        email,
        role: i <= 2 ? "HR" : "EMPLOYEE",
        birthDate: pastDate(365 * (20 + Math.floor(Math.random() * 25))),
        sex: Math.random() > 0.5 ? "FEMININO" : "MASCULINO",
        nationality: "Brasileira",
        maritalStatus: randomFrom(["SOLTEIRO", "CASADO", "DIVORCIADO"]),
        motherName: fullName(),
        addressZip: "01000-000",
        addressStreet: "Rua Exemplo",
        addressNumber: String(100 + i),
        addressCity: "São Paulo",
        addressState: "SP",
        phone: `(11) 9${String(10000000 + i).padStart(8, "0")}`,
        cpf: fakeCpf(i),
        department,
        position,
        admissionDate: pastDate(30 * (i + 1)),
        salary: 2500 + i * 350,
        workSchedule: randomFrom(WORK_SCHEDULES),
        transportVoucherOptIn: Math.random() > 0.5,
      },
    });
    colaboradores.push(user);
    console.log(`  + ${name} <${email}> (${position}, ${department})`);
  }
  console.log(`Colaboradores: ${colaboradores.length} disponíveis.`);
  return colaboradores;
}

async function seedJobs(companyId) {
  const jobsData = [
    {
      title: "Vendedor(a) Externo",
      workMode: "PRESENCIAL",
      status: "OPEN",
      description: "Atuação em vendas externas na região metropolitana, visitando clientes e prospectando novas contas.",
    },
    {
      title: "Desenvolvedor(a) Frontend",
      workMode: "REMOTO",
      status: "OPEN",
      description: "Vaga remota para atuar com React/Next.js no time de produto.",
    },
    {
      title: "Assistente Administrativo",
      workMode: "HIBRIDO",
      status: "DRAFT",
      description: "Rotinas administrativas e apoio operacional ao time de RH.",
    },
    {
      title: "Analista de RH Pleno",
      workMode: "PRESENCIAL",
      status: "CLOSED",
      description: "Vaga encerrada — processo seletivo já finalizado.",
    },
  ];

  const jobs = [];
  for (const jobData of jobsData) {
    const existing = await prisma.job.findFirst({ where: { companyId, title: jobData.title } });
    if (existing) {
      jobs.push(existing);
      continue;
    }
    const job = await prisma.job.create({
      data: { companyId, employmentType: "CLT", location: "São Paulo, SP", ...jobData },
    });
    jobs.push(job);
    console.log(`  + ${job.title} (${job.status})`);
  }
  console.log(`Vagas: ${jobs.length} disponíveis.`);
  return jobs;
}

async function seedCandidates(companyId, jobs) {
  const openJobs = jobs.filter((j) => j.status === "OPEN");
  let count = 0;
  for (const [jobIndex, job] of openJobs.entries()) {
    for (let i = 1; i <= 4; i++) {
      const email = `candidato${jobIndex}-${i}@exemplo.com`;
      const existing = await prisma.candidate.findFirst({ where: { companyId, jobId: job.id, email } });
      if (existing) continue;

      const name = fullName();
      await prisma.candidate.create({
        data: {
          companyId,
          jobId: job.id,
          name,
          email,
          phone: `(11) 9${String(20000000 + jobIndex * 10 + i).padStart(8, "0")}`,
          stage: randomFrom(CANDIDATE_STAGES),
          qualificationTag: Math.random() > 0.3 ? randomFrom(CANDIDATE_TAGS) : null,
        },
      });
      count++;
    }
  }
  console.log(`Candidatos: ${count} novo(s) criado(s).`);
}

function currentCompetence() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

async function seedBudgets(companyId, colaboradores) {
  const competence = currentCompetence();

  const salaryByDept = {};
  for (const colaborador of colaboradores) {
    if (!colaborador.department) continue;
    const salary = Number(colaborador.salary ?? 0);
    salaryByDept[colaborador.department] = (salaryByDept[colaborador.department] ?? 0) + salary;
  }

  let budgetCount = 0;
  for (const department of DEPARTMENTS) {
    const salaryTotal = salaryByDept[department] ?? 0;
    const allocations = {
      SALARIO: Math.round((salaryTotal || 4000) * 1.05),
      TREINAMENTO: 2000 + DEPARTMENTS.indexOf(department) * 300,
      CONFRATERNIZACOES: 800,
    };
    for (const category of BUDGET_CATEGORIES) {
      const existing = await prisma.budget.findUnique({
        where: { companyId_department_category_competence: { companyId, department, category, competence } },
      });
      if (existing) continue;
      await prisma.budget.create({
        data: { companyId, department, category, competence, amount: allocations[category] },
      });
      budgetCount++;
    }
  }
  console.log(`Orçamentos: ${budgetCount} alocação(ões) nova(s).`);

  const expensesData = [
    { department: "Comercial", category: "TREINAMENTO", description: "Treinamento de técnicas de vendas", amount: 1200 },
    { department: "Tecnologia", category: "TREINAMENTO", description: "Curso de certificação AWS", amount: 2400 },
    { department: "RH", category: "CONFRATERNIZACOES", description: "Happy hour trimestral", amount: 650 },
    { department: "Operações", category: "CONFRATERNIZACOES", description: "Almoço de confraternização", amount: 950 },
  ];
  let expenseCount = 0;
  for (const expense of expensesData) {
    const expenseDate = new Date(Date.UTC(competence.getUTCFullYear(), competence.getUTCMonth(), 10));
    const existing = await prisma.budgetExpense.findFirst({
      where: { companyId, department: expense.department, category: expense.category, description: expense.description },
    });
    if (existing) continue;
    await prisma.budgetExpense.create({ data: { companyId, expenseDate, ...expense } });
    expenseCount++;
  }
  console.log(`Gastos lançados: ${expenseCount} novo(s).`);
}

async function main() {
  const company = await prisma.company.findUnique({ where: { slug: COMPANY_SLUG } });
  if (!company) {
    throw new Error(`Empresa "${COMPANY_SLUG}" não encontrada — rode scripts/seed-admin.js primeiro.`);
  }

  console.log(`Populando dados fictícios para: ${company.name}\n`);

  await seedCompanyOptions(company.id);
  const colaboradores = await seedColaboradores(company);
  const jobs = await seedJobs(company.id);
  await seedCandidates(company.id, jobs);
  await seedBudgets(company.id, colaboradores);

  console.log("\nPronto! Dados fictícios populados com sucesso.");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

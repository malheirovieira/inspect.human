// Popula a empresa de teste INSPECT.IO (vagas, candidatos pelo funil,
// funcionários) pra testar o sistema de ponta a ponta sem usar dados de
// EngeBag/BagCleaner. Sempre filtrado por companyId — nunca toca em outra
// empresa. Idempotente (roda de novo sem duplicar) e com `--reset` (apaga só
// os registros marcados como seed desta empresa, antes de recriar).
//
// Uso:
//   npx tsx scripts/seedInspectIo.ts          # cria (ou completa) os dados
//   npx tsx scripts/seedInspectIo.ts --reset  # apaga os dados de seed e recria
//
// Identificação do que é "seed" (pra --reset e pra nunca duplicar): e-mail
// termina em @teste.inspecttalent.com, OU é um dos dois endereços reais
// abaixo (candidatos que testam o e-mail de entrevista de verdade); vagas
// pelos títulos fixos abaixo. Tudo sempre escopado a companyId = INSPECT.IO.
import path from "path";
import dotenv from "dotenv";
import { randomUUID } from "crypto";
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

// Não importamos as Server Actions/services do app diretamente: elas puxam
// módulos amarrados ao runtime do Next (import "server-only", cache() do
// React, next/headers) que quebram fora dele. Em vez disso, este script
// replica exatamente as mesmas escritas/eventos que cada action faria —
// applyToJob (app/empresa/[slug]/vagas/[jobId]/actions.ts), setCandidateTag/
// moveCandidateStage (banco-de-talentos/actions.ts), scheduleInterview
// (app/actions/scheduleInterview.ts), enqueueEmail (lib/email.ts) e
// submitDiscAssessment (app/actions/submitDiscAssessment.ts) — usando só
// módulos "puros" (lib/resumes/versioning.ts, lib/resumes/files.ts,
// lib/disc/calculate.ts) que não têm essa dependência.
const EMAIL_SEND_TASK = "email.send"; // mesmo valor de lib/tasks/handlers/emailSend.ts
const RESUME_BUCKET = "resumes"; // lib/resumes/files.ts

const COMPANY_SLUG = "inspect-io";
const TEST_DOMAIN = "teste.inspecttalent.com";
// E-mail real (Gmail com +tag) — só estes dois disparam envio de verdade via
// Resend (só a etapa de Entrevista manda e-mail nesse sistema).
const REAL_EMAIL_BASE = "malheirovieira123";
const REAL_EMAIL_DOMAIN = "gmail.com";

const NEW_JOB_TITLES = {
  rh: "Analista de Recursos Humanos Pleno",
  backend: "Desenvolvedor(a) Backend Pleno",
  operacoes: "Coordenador(a) de Operações",
  administrativo: "Assistente Administrativo Jr.",
} as const;

function candidateEmail(n: number): string {
  return `candidato${String(n).padStart(2, "0")}@${TEST_DOMAIN}`;
}
function colaboradorEmail(n: number): string {
  return `colaborador${String(n).padStart(2, "0")}@${TEST_DOMAIN}`;
}
function realEmail(tag: string): string {
  return `${REAL_EMAIL_BASE}+${tag}@${REAL_EMAIL_DOMAIN}`;
}
function fakePhone(seed: number): string {
  return `1199${String(700000 + seed).padStart(7, "0")}`;
}
function fakeCpf(seed: number): string {
  return String(20000000000 + seed).padStart(11, "0");
}
function daysFromNow(days: number, hour = 14): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d;
}

// PDF mínimo válido (só o cabeçalho precisa começar com "%PDF-" — ver
// lib/resumes/files.ts isPdfBuffer). Mesmo arquivo reaproveitado pra todo
// candidato: o dedup de versão é por candidateId+sha256, não global.
const FAKE_RESUME_PDF = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Size 4/Root 1 0 R>>\n%%EOF",
  "utf-8"
);

type CandidateScenario = {
  name: string;
  email: string;
  jobTitle: string;
  tag: "GREEN" | "BLUE" | "RED" | null;
  // Etapa final desejada — a função aplica a MESMA regra real
  // (resolveTargetStage: sem tag GREEN, sair de Triagem reprova sozinho).
  targetStage: "TRIAGE" | "INTERVIEW" | "TEST" | "PROPOSAL" | "HIRED" | "REJECTED";
  interview?: { scheduledAt: Date; label: string };
  disc?: "PENDING" | "ANSWERED";
};

function buildScenarios(): CandidateScenario[] {
  const J0 = "Analista de Tecnologia da Informação Pleno"; // vaga já existente
  const J1 = NEW_JOB_TITLES.rh;
  const J2 = NEW_JOB_TITLES.backend;

  return [
    { name: "Ana Beatriz Souza", email: candidateEmail(1), jobTitle: J0, tag: null, targetStage: "TRIAGE" },
    { name: "Bruno Carvalho Lima", email: candidateEmail(2), jobTitle: J1, tag: null, targetStage: "TRIAGE" },
    { name: "Carla Mendes Rocha", email: candidateEmail(3), jobTitle: J2, tag: "GREEN", targetStage: "TRIAGE" },
    { name: "Diego Ferreira Alves", email: candidateEmail(4), jobTitle: J0, tag: "BLUE", targetStage: "TRIAGE" },
    // RED reprova na hora (setCandidateTag) — targetStage já reflete isso
    // (REJECTED), senão o bloco de etapa abaixo reverteria de volta pra TRIAGE.
    { name: "Elaine Pires Santos", email: candidateEmail(5), jobTitle: J1, tag: "RED", targetStage: "REJECTED" },
    // Sem tag GREEN, tentando sair de Triagem pra Entrevista: reprova sozinho (resolveTargetStage).
    { name: "Fábio Nogueira Costa", email: candidateEmail(6), jobTitle: J2, tag: null, targetStage: "INTERVIEW" },
    {
      name: "Gabriela Torres Melo",
      email: realEmail("entrevista.agendada"),
      jobTitle: J0,
      tag: "GREEN",
      targetStage: "INTERVIEW",
      interview: { scheduledAt: daysFromNow(1, 14), label: "agendada para amanhã 14h" },
    },
    {
      name: "Henrique Duarte Ramos",
      email: realEmail("entrevista.realizada"),
      jobTitle: J1,
      tag: "GREEN",
      targetStage: "INTERVIEW",
      interview: { scheduledAt: daysFromNow(-5, 10), label: "já realizada (5 dias atrás)" },
    },
    { name: "Isabela Ramos Cunha", email: candidateEmail(7), jobTitle: J2, tag: "GREEN", targetStage: "TEST", disc: "PENDING" },
    { name: "João Vitor Andrade", email: candidateEmail(8), jobTitle: J0, tag: "GREEN", targetStage: "TEST", disc: "ANSWERED" },
    { name: "Karina Souza Batista", email: candidateEmail(9), jobTitle: J1, tag: "GREEN", targetStage: "PROPOSAL" },
    { name: "Lucas Martins Oliveira", email: candidateEmail(10), jobTitle: J2, tag: "GREEN", targetStage: "PROPOSAL" },
    { name: "Mariana Teixeira Rocha", email: candidateEmail(11), jobTitle: J0, tag: "GREEN", targetStage: "HIRED" },
    { name: "Nicolas Barbosa Silva", email: candidateEmail(12), jobTitle: J1, tag: "GREEN", targetStage: "REJECTED" },
  ];
}

type ColaboradorSeed = {
  name: string;
  email: string;
  role: "ADMIN" | "HR" | "EMPLOYEE";
  department: string;
  position: string;
  salary: number;
  desligar?: boolean;
};

const COLABORADORES: ColaboradorSeed[] = [
  { name: "Patrícia Gonçalves Reis", email: colaboradorEmail(1), role: "HR", department: "RH", position: "Analista de RH", salary: 4200 },
  { name: "Rafael Dias Monteiro", email: colaboradorEmail(2), role: "EMPLOYEE", department: "Tecnologia", position: "Analista de Suporte", salary: 3800 },
  { name: "Sabrina Lopes Farias", email: colaboradorEmail(3), role: "EMPLOYEE", department: "Financeiro", position: "Analista Financeiro", salary: 4500 },
  { name: "Thiago Correia Vidal", email: colaboradorEmail(4), role: "EMPLOYEE", department: "Comercial", position: "Vendedor(a)", salary: 3200 },
  { name: "Vanessa Aguiar Prado", email: colaboradorEmail(5), role: "EMPLOYEE", department: "Operações", position: "Assistente Administrativo", salary: 2900 },
  { name: "Otávio Barros Cardoso", email: colaboradorEmail(6), role: "EMPLOYEE", department: "Tecnologia", position: "Analista de Suporte", salary: 3600, desligar: true },
];

async function main() {
  const reset = process.argv.includes("--reset");

  const { PrismaClient } = await import("@prisma/client");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const { createClient } = await import("@supabase/supabase-js");

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const company = await prisma.company.findUnique({ where: { slug: COMPANY_SLUG } });
  if (!company) {
    console.error(`Empresa "${COMPANY_SLUG}" não encontrada. Nada foi feito.`);
    await prisma.$disconnect();
    process.exit(1);
  }
  // Cinto e suspensório: toda query abaixo usa companyId explícito, mas
  // confirmamos aqui de novo que é mesmo a empresa de teste antes de escrever.
  if (company.slug !== "inspect-io") throw new Error("Guard: empresa errada, abortando.");
  const companyId = company.id;
  console.log(`Empresa: ${company.name} (${companyId})\n`);

  if (reset) {
    await resetSeed(prisma, supabaseAdmin, companyId);
    console.log("\nReset concluído.");
    await prisma.$disconnect();
    return;
  }

  await seed(prisma, supabaseAdmin, companyId);
  await seedColaboradores(prisma, supabaseAdmin, companyId);

  await prisma.$disconnect();
}

async function resetSeed(prisma: any, supabaseAdmin: any, companyId: string) {
  console.log("Revertendo dados de seed da INSPECT.IO...\n");

  const candidates = await prisma.candidate.findMany({
    where: { companyId, email: { contains: `@${TEST_DOMAIN}` } },
    select: { id: true, email: true },
  });
  const realCandidates = await prisma.candidate.findMany({
    where: { companyId, email: { in: [realEmail("entrevista.agendada"), realEmail("entrevista.realizada")] } },
    select: { id: true, email: true },
  });
  const allTestCandidates = [...candidates, ...realCandidates];
  if (allTestCandidates.length > 0) {
    await prisma.candidate.deleteMany({ where: { id: { in: allTestCandidates.map((c: any) => c.id) } } });
    console.log(`Candidatos removidos (cascata: candidaturas, entrevistas, DISC, eventos): ${allTestCandidates.length}`);
  }

  const jobs = await prisma.job.findMany({
    where: { companyId, title: { in: Object.values(NEW_JOB_TITLES) } },
    select: { id: true, title: true },
  });
  if (jobs.length > 0) {
    await prisma.job.deleteMany({ where: { id: { in: jobs.map((j: any) => j.id) } } });
    console.log(`Vagas removidas: ${jobs.map((j: any) => j.title).join(", ")}`);
  }

  const colaboradores = await prisma.user.findMany({
    where: { companyId, email: { contains: `@${TEST_DOMAIN}` } },
    select: { id: true, email: true },
  });
  if (colaboradores.length > 0) {
    await prisma.employeeExit.deleteMany({ where: { userId: { in: colaboradores.map((u: any) => u.id) } } });
    await prisma.user.deleteMany({ where: { id: { in: colaboradores.map((u: any) => u.id) } } });
    for (const u of colaboradores) {
      await supabaseAdmin.auth.admin.deleteUser(u.id).catch(() => {});
    }
    console.log(`Colaboradores removidos: ${colaboradores.length}`);
  }
}

async function seed(prisma: any, supabaseAdmin: any, companyId: string) {
  // Reativa a avaliação DISC padrão — pode ter sido arquivada (active=false)
  // por já ter resposta pendente; arquivar não bloqueia link já existente,
  // só impede gerar um NOVO (ver lib/actions/generateDiscLink.ts).
  const discAssessment = await prisma.discAssessment.findFirst({
    where: { companyId },
    orderBy: { createdAt: "asc" },
    include: { questions: true },
  });
  if (discAssessment && !discAssessment.active) {
    await prisma.discAssessment.update({ where: { id: discAssessment.id }, data: { active: true } });
    console.log(`DISC "${discAssessment.title}" reativada (estava arquivada).`);
  }

  // ---- Vagas ----
  const jobDefs = [
    {
      title: NEW_JOB_TITLES.rh,
      status: "OPEN",
      workMode: "HIBRIDO",
      department: "RH",
      description: "Atuação em recrutamento, seleção e rotinas de departamento pessoal.",
    },
    {
      title: NEW_JOB_TITLES.backend,
      status: "OPEN",
      workMode: "REMOTO",
      department: "Tecnologia",
      description: "Desenvolvimento e manutenção de APIs Node.js/PostgreSQL para o produto principal.",
    },
    {
      title: NEW_JOB_TITLES.operacoes,
      status: "DRAFT",
      workMode: "PRESENCIAL",
      department: "Operações",
      description: "Coordenação das rotinas operacionais e times de suporte interno. Vaga ainda não publicada.",
    },
    {
      title: NEW_JOB_TITLES.administrativo,
      status: "CLOSED",
      workMode: "PRESENCIAL",
      department: "Administrativo",
      description: "Processo seletivo já encerrado — vaga de referência para testar status CLOSED.",
    },
  ] as const;

  const jobsByTitle = new Map<string, { id: string; title: string; status: string }>();
  const existingJob = await prisma.job.findFirst({ where: { companyId, status: "OPEN" }, orderBy: { createdAt: "asc" } });
  if (existingJob) jobsByTitle.set(existingJob.title, existingJob);

  for (const def of jobDefs) {
    let job = await prisma.job.findFirst({ where: { companyId, title: def.title } });
    if (!job) {
      job = await prisma.job.create({
        data: {
          companyId,
          title: def.title,
          description: def.description,
          department: def.department,
          workMode: def.workMode,
          status: def.status,
          publishedAt: def.status === "OPEN" ? new Date() : null,
        },
      });
      console.log(`+ Vaga "${job.title}" (${job.status})`);
    } else {
      console.log(`= Vaga "${job.title}" já existia, pulando.`);
    }
    jobsByTitle.set(job.title, job);
  }

  // ---- Candidatos / candidaturas (mesma validação/gravação de applyToJob) ----
  const { applyToJobSchema } = await import("../schemas/candidate");
  const { storeResumeVersionWith } = await import("../lib/resumes/versioning");
  const { calculateDiscResult } = await import("../lib/disc/calculate");

  async function logEvent(applicationId: string, type: string, payload: Record<string, unknown>) {
    await prisma.applicationEvent.create({ data: { companyId, applicationId, type, payload, actorId: null } });
  }

  function renderTemplate(template: string, variables: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) result = result.replace(new RegExp(`{{${key}}}`, "g"), value);
    return result;
  }

  // Réplica de lib/email.ts enqueueEmail: cria o EmailLog e enfileira a
  // tarefa direto na tabela (mesmo formato que lib/tasks/queue.ts grava) —
  // o pg_cron de produção processa e manda pelo Resend de verdade.
  async function enqueueEmailDirect(applicationId: string, templateId: string, variables: Record<string, string>, recipientEmail: string) {
    const template = await prisma.emailTemplate.findUnique({ where: { id: templateId } });
    if (!template) throw new Error(`Template ${templateId} não encontrado`);
    const emailLog = await prisma.emailLog.create({
      data: {
        applicationId,
        templateId,
        recipientEmail,
        subject: renderTemplate(template.subject, variables),
        bodyHtml: renderTemplate(template.bodyHtml, variables),
        status: "queued",
      },
    });
    await prisma.$queryRaw`
      insert into public.background_tasks (company_id, type, payload, max_attempts, run_at, idempotency_key)
      values (${companyId}::uuid, ${EMAIL_SEND_TASK}, ${JSON.stringify({ emailLogId: emailLog.id })}::jsonb, 5, now(), ${`${EMAIL_SEND_TASK}:${emailLog.id}`})
      on conflict (idempotency_key) do nothing
    `;
    return emailLog;
  }

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  const scenarios = buildScenarios();
  const report: string[] = [];

  for (const [index, scenario] of scenarios.entries()) {
    const job = jobsByTitle.get(scenario.jobTitle);
    if (!job) {
      console.error(`Vaga "${scenario.jobTitle}" não encontrada para ${scenario.name} — pulando.`);
      continue;
    }

    let candidate = await prisma.candidate.findFirst({ where: { companyId, email: scenario.email } });
    let application = candidate
      ? await prisma.application.findFirst({ where: { companyId, candidateId: candidate.id, jobId: job.id } })
      : null;
    const justCreated = !application;

    if (!application) {
      const parsed = applyToJobSchema.safeParse({ name: scenario.name, email: scenario.email, phone: fakePhone(index + 1) });
      if (!parsed.success) {
        console.error(`Dados inválidos pra ${scenario.name}: ${parsed.error.issues[0]?.message}`);
        continue;
      }

      if (!candidate) {
        candidate = await prisma.candidate.create({
          data: { companyId, name: parsed.data.name, email: parsed.data.email, phone: parsed.data.phone, isTest: true },
        });
      }

      application = await prisma.application.create({ data: { companyId, candidateId: candidate.id, jobId: job.id } });
      await logEvent(application.id, "APPLICATION_CREATED", { source: "PUBLIC_FORM" });
      await prisma.notification.create({
        data: {
          companyId,
          type: "CANDIDATE_APPLIED",
          title: "Nova candidatura",
          message: `${candidate.name} se candidatou para ${job.title}`,
          link: `/recrutamento/vagas/${job.id}/candidaturas/${application.id}`,
        },
      });

      // Currículo — mesmo pipeline de versionamento/dedup de storeResumeVersion.ts,
      // sem a análise por IA (requestResumeAnalysis fica de fora de propósito:
      // depende de módulos presos ao runtime do Next, e é best-effort mesmo no app real).
      const uploaded = await storeResumeVersionWith(
        prisma,
        {
          async uploadIfAbsent(path: string, data: Buffer) {
            const { error } = await supabaseAdmin.storage.from(RESUME_BUCKET).upload(path, data, { contentType: "application/pdf", upsert: false });
            if (!error) return { error: null };
            const status = String((error as { statusCode?: unknown }).statusCode ?? "");
            if (status === "409" || /already exists/i.test(error.message)) return { error: null };
            return { error: error.message };
          },
        },
        { companyId, candidateId: candidate.id, data: FAKE_RESUME_PDF, source: "PUBLIC_FORM", uploadedById: null, applicationId: application.id }
      );
      if (!uploaded.ok) console.error(`  currículo não salvo para ${scenario.name}: ${uploaded.error}`);

      console.log(`+ Candidatura: ${scenario.name} -> ${job.title}`);
    } else {
      console.log(`= Candidatura de ${scenario.name} já existia, pulando criação (aplicando só o estado abaixo).`);
    }

    if (!application) continue;

    // Tag e etapa só na primeira vez — candidatura que já existia já está no
    // estado final desejado; reaplicar duplicaria eventos de auditoria à toa.
    // (Interview/DISC abaixo já têm sua própria checagem de "já existe".)
    if (justCreated && scenario.tag) {
      const finalStage = scenario.tag === "RED" ? "REJECTED" : application.stage;
      await prisma.application.update({ where: { id: application.id }, data: { qualificationTag: scenario.tag, stage: finalStage } });
      await logEvent(application.id, "TAG_CHANGED", { from: null, to: scenario.tag });
      application.stage = finalStage;
      application.qualificationTag = scenario.tag;
    }

    // Etapa (mesma regra de resolveTargetStage: sair de Triagem sem GREEN reprova sozinho).
    // Pulado se a tag RED já reprovou: senão isso reverteria o REJECTED de volta.
    if (justCreated && scenario.targetStage !== application.stage && !(scenario.tag === "RED" && application.stage === "REJECTED")) {
      const leavingTriageForward = application.stage === "TRIAGE" && scenario.targetStage !== "TRIAGE" && scenario.targetStage !== "REJECTED";
      const finalStage = leavingTriageForward && application.qualificationTag !== "GREEN" ? "REJECTED" : scenario.targetStage;
      await prisma.application.update({
        where: { id: application.id },
        data: { stage: finalStage, hiredAt: finalStage === "HIRED" ? new Date() : undefined },
      });
      await logEvent(application.id, "STAGE_CHANGED", { from: application.stage, to: finalStage });
      application.stage = finalStage;
    }

    // Entrevista (mesmo fluxo de scheduleInterview: cria Interview + manda e-mail real).
    if (scenario.interview) {
      const existingInterview = await prisma.interview.findUnique({ where: { applicationId: application.id } });
      if (!existingInterview) {
        await prisma.interview.create({
          data: {
            applicationId: application.id,
            scheduledAt: scenario.interview.scheduledAt,
            scheduledBy: (await prisma.user.findFirst({ where: { companyId, role: "ADMIN" } }))!.id,
            modality: "REMOTO",
            interviewerName: "Recrutador(a) INSPECT.IO",
          },
        });
        const template = await prisma.emailTemplate.findFirst({ where: { companyId, name: "Convite Entrevista" } });
        if (template) {
          try {
            await enqueueEmailDirect(
              application.id,
              template.id,
              {
                candidateName: scenario.name,
                interviewDate: scenario.interview.scheduledAt.toLocaleDateString("pt-BR"),
                interviewTime: scenario.interview.scheduledAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
                candidateEmail: scenario.email,
              },
              scenario.email
            );
            console.log(`  e-mail "Convite Entrevista" enfileirado para ${scenario.email}`);
          } catch (err) {
            console.error(`  falha ao enfileirar e-mail de entrevista para ${scenario.email}:`, err);
          }
        }
        await logEvent(application.id, "INTERVIEW_SCHEDULED", { scheduledAt: scenario.interview.scheduledAt.toISOString() });
      }
    }

    // DISC (mesmo mecanismo de generateDiscLink + submissão real via submitDiscAssessment).
    if (scenario.disc && discAssessment) {
      let discResponse = await prisma.discResponse.findUnique({
        where: { applicationId_assessmentId: { applicationId: application.id, assessmentId: discAssessment.id } },
      });
      if (!discResponse) {
        discResponse = await prisma.discResponse.create({
          data: {
            companyId,
            applicationId: application.id,
            assessmentId: discAssessment.id,
            token: randomUUID().replace(/-/g, ""),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });
      }

      if (scenario.disc === "ANSWERED" && !discResponse.submittedAt) {
        // Réplica de app/actions/submitDiscAssessment.ts: nota por pergunta
        // (1-5) escolhida por dimensão, cálculo real via lib/disc/calculate.ts.
        const answersForCalc: { dimension: string; section: "COMPETENCIAS" | "DISC"; score: number }[] = [];
        const answersToInsert: { companyId: string; responseId: string; questionId: string; score: number }[] = [];
        for (const q of discAssessment.questions) {
          const score = q.section === "DISC" ? (q.dimension === "D" ? 5 : q.dimension === "C" ? 4 : q.dimension === "I" ? 2 : 1) : 4;
          answersForCalc.push({ dimension: q.dimension, section: q.section as "COMPETENCIAS" | "DISC", score });
          answersToInsert.push({ companyId, responseId: discResponse.id, questionId: q.id, score });
        }
        const result = calculateDiscResult(answersForCalc);
        await prisma.$transaction([
          prisma.discAnswer.createMany({ data: answersToInsert }),
          prisma.discResponse.update({ where: { id: discResponse.id }, data: { submittedAt: new Date(), ...result } }),
        ]);
        await logEvent(application.id, "DISC_SUBMITTED", { perfilDisc: result.perfilDisc, scoreGeral: result.scoreGeral, nivelGeral: result.nivelGeral });
        console.log(`  DISC respondido: ${scenario.name} -> perfil ${result.perfilDisc} (${result.scoreGeral}/100)`);
      } else if (scenario.disc === "PENDING") {
        console.log(`  DISC enviado (pendente): ${scenario.name} -> /avaliacao/${discResponse.token}`);
      }
    }

    report.push(`${scenario.name} <${scenario.email}> — vaga "${job.title}" — etapa final: ${application.stage}${application.qualificationTag ? ` (tag ${application.qualificationTag})` : ""}`);
  }

  console.log("\n--- Resumo dos candidatos de teste ---");
  report.forEach((line) => console.log(line));
}

async function seedColaboradores(prisma: any, supabaseAdmin: any, companyId: string) {
  console.log("\n--- Colaboradores ---");
  const admissionBase = new Date();
  admissionBase.setMonth(admissionBase.getMonth() - 6);

  for (const [index, colaborador] of COLABORADORES.entries()) {
    const existing = await prisma.user.findFirst({ where: { companyId, email: colaborador.email } });
    if (existing) {
      console.log(`= Colaborador ${colaborador.name} já existia, pulando.`);
      continue;
    }

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: colaborador.email,
      password: randomUUID(),
      email_confirm: true,
    });
    if (error || !created.user) {
      console.error(`Falha ao criar acesso para ${colaborador.email}: ${error?.message}`);
      continue;
    }

    const user = await prisma.user.create({
      data: {
        id: created.user.id,
        companyId,
        name: colaborador.name,
        email: colaborador.email,
        role: colaborador.role,
        mustChangePassword: true,
        birthDate: new Date(1985 + index, index % 12, 10),
        sex: index % 2 === 0 ? "FEMININO" : "MASCULINO",
        nationality: "Brasileira",
        maritalStatus: "SOLTEIRO",
        motherName: `Mãe de ${colaborador.name}`,
        addressZip: "01000-000",
        addressStreet: "Rua de Teste",
        addressNumber: String(100 + index),
        addressCity: "São Paulo",
        addressState: "SP",
        phone: fakePhone(100 + index),
        cpf: fakeCpf(index),
        department: colaborador.department,
        position: colaborador.position,
        admissionDate: new Date(admissionBase.getFullYear(), admissionBase.getMonth() - index, 1),
        salary: colaborador.salary,
        workSchedule: "Seg-Sex 09h-18h",
        transportVoucherOptIn: index % 2 === 0,
      },
    });
    console.log(`+ Colaborador ${user.name} <${user.email}> (${colaborador.position})`);

    if (colaborador.desligar) {
      await prisma.employeeExit.create({
        data: {
          companyId,
          userId: user.id,
          userName: user.name,
          department: user.department,
          position: user.position,
          admissionDate: user.admissionDate,
          exitDate: new Date(),
          exitType: "INVOLUNTARIA",
          reason: "SEM_JUSTA_CAUSA",
          notes: "Desligamento de teste (seed INSPECT.IO).",
          rehireEligible: true,
        },
      });
      await prisma.user.update({ where: { id: user.id }, data: { active: false } });
      console.log(`  desligado (EmployeeExit criado, usuário marcado inativo).`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

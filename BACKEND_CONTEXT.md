# Inspect Human — Contexto de back-end (pra revisão/padronização)

> Gerado a partir do estado real do repositório (schema, migrations, services
> e actions lidos diretamente dos arquivos, não de memória). Objetivo: dar
> pra outra sessão/IA tudo que precisa pra discutir padronização e ajustes no
> back-end sem precisar re-explorar o projeto do zero.

## Redução de escopo (mudança mais recente, migrations 0013-0015)

O produto deixou de cobrir **folha de pagamento, ponto e orçamento** — foco
agora é só **recrutamento + desenvolvimento de colaboradores** (a ficha
completa de colaborador e desligamentos/turnover continuam).

- **Removido:** models `TimeClock`, `PayrollVariable`, `Budget`,
  `BudgetExpense` (tabelas `time_clocks`, `payroll_variables`, `budgets`,
  `budget_expenses` dropadas — migration `0014`). A categoria
  `CATEGORIA_BUDGET` de `CompanyOption` também saiu, junto com as 7 linhas
  que existiam (migration `0015`, que também estreitou de volta o check
  constraint de `company_options.category` pra só `SETOR` /
  `HORARIO_TRABALHO` / `MODALIDADE_CONTRATACAO`).
- **Adicionado:** model `EmployeeDocument` (tabela `employee_documents`,
  migration `0013`) — documento anexado à ficha do colaborador. **Upload
  real ainda não implementado** (bucket no Storage + action + UI faltam) —
  só existe a tabela e o campo `fileUrl` (guarda um path, não o binário).
- **Backup pré-DROP:** `budgets`/`budget_expenses` tinham dado (demo, 15 e
  4 linhas) — exportado pra CSV em `supabase/backups/` antes do DROP.
  `time_clocks`/`payroll_variables` estavam vazias.
- **Efeito colateral não previsto no plano original:** a rota/página
  `/gestao/relatorios` foi removida junto, porque **100% do seu conteúdo**
  era relatório de consumo de orçamento — não sobrava nada sem `Budget`.
  Ficou registrado como pendência de reconstrução (focada em
  recrutamento/desenvolvimento), não decidido ainda.
- `services/kpis.ts`: o KPI de "desvio de orçamento" foi removido. O de
  "custo médio por colaborador" **ficou como estava** — ele só usa
  `User.salary`, nunca dependeu de `budget_expenses` (checado antes de
  decidir).

## Stack de dados

- **Postgres via Supabase.** Dois schemas: `public` (tabelas de negócio) e
  `auth` (gerenciado pelo Supabase Auth, o Prisma só tem um stub ignorado
  pra satisfazer a FK `users.id → auth.users.id`).
- **Prisma 7** com `@prisma/adapter-pg`. **Não usa `prisma migrate`** — as
  migrations são SQL escrito à mão em `supabase/migrations/NNNN_*.sql` e
  aplicadas manualmente via `npx prisma db execute --file <arquivo>`, depois
  `npx prisma generate`. `supabase/schema.sql` é mantido como o documento
  "banco do zero" e precisa ser atualizado a cada migration nova (nem
  sempre é — ver seção de riscos).
- **Correção em relação a uma versão anterior deste arquivo**: `RLS está
  parcialmente ativo`, não "nenhuma tabela tem RLS". `supabase/schema.sql`
  tem uma seção "rede de segurança" que roda `alter table ... enable row
  level security` em `companies`, `users`, `jobs`, `candidates`,
  `training_trails`, `training_items`, `training_assignments`,
  `training_progress`, seguida de `revoke all ... from anon, authenticated`
  — nega tudo por padrão pros roles públicos do Supabase (o acesso
  legítimo passa pelo servidor Next.js com a `service_role`, que ignora
  RLS). Mas essa lista **não inclui** `company_options`, `employee_exits`,
  `kanban_stage_labels`, `employee_documents` — gap real, não é por
  design. Se for padronizar algo, isso é um bom candidato: ou completar a
  lista, ou documentar explicitamente por que essas ficaram de fora.
  (Não investiguei se essa seção do `schema.sql` foi de fato executada no
  banco Supabase real ou só existe como documentação "from scratch" —
  vale confirmar antes de assumir qualquer coisa sobre o estado ao vivo.)

## `prisma/schema.prisma` (conteúdo real, verbatim, pós-migrations 0013-0015)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  schemas  = ["public", "auth"]
}

model AuthUser {
  id String @id @db.Uuid

  @@map("users")
  @@schema("auth")
  @@ignore
}

model Company {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name        String
  slug        String   @unique
  description String?
  active      Boolean  @default(true)
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt   DateTime @default(now()) @map("updated_at") @db.Timestamptz(6)

  users               User[]
  jobs                Job[]
  candidates          Candidate[]
  trainingTrails      TrainingTrail[]
  trainingItems       TrainingItem[]
  trainingAssignments TrainingAssignment[]
  trainingProgress    TrainingProgress[]
  companyOptions      CompanyOption[]
  employeeExits       EmployeeExit[]
  kanbanStageLabels   KanbanStageLabel[]
  employeeDocuments   EmployeeDocument[]

  @@map("companies")
  @@schema("public")
}

model CompanyOption {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  companyId String   @map("company_id") @db.Uuid
  category  String
  label     String
  active    Boolean  @default(true)
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@unique([companyId, category, label])
  @@index([companyId, category])
  @@map("company_options")
  @@schema("public")
}

model User {
  id        String   @id @db.Uuid
  companyId String   @map("company_id") @db.Uuid
  name      String
  email     String
  role      String
  active    Boolean  @default(true)
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime @default(now()) @map("updated_at") @db.Timestamptz(6)

  birthDate           DateTime? @map("birth_date") @db.Date
  sex                 String?   @map("sex")
  nationality         String?   @map("nationality")
  birthplace          String?   @map("birthplace")
  maritalStatus       String?   @map("marital_status")
  motherName          String?   @map("mother_name")
  fatherName          String?   @map("father_name")
  addressZip          String?   @map("address_zip")
  addressStreet       String?   @map("address_street")
  addressNumber       String?   @map("address_number")
  addressComplement   String?   @map("address_complement")
  addressNeighborhood String?   @map("address_neighborhood")
  addressCity         String?   @map("address_city")
  addressState        String?   @map("address_state")
  phone               String?   @map("phone")
  educationLevel      String?   @map("education_level")
  raceColor           String?   @map("race_color")

  cpf                  String? @map("cpf")
  idDocumentType       String? @map("id_document_type")
  idDocumentNumber     String? @map("id_document_number")
  ctpsNumber           String? @map("ctps_number")
  pisNumber            String? @map("pis_number")
  voterTitleNumber     String? @map("voter_title_number")
  reservistCertificate String? @map("reservist_certificate")
  civilRegistryType    String? @map("civil_registry_type")
  civilRegistryNumber  String? @map("civil_registry_number")

  department         String?   @map("department")
  position           String?   @map("position")
  admissionDate      DateTime? @map("admission_date") @db.Date
  salary             Decimal?  @map("salary") @db.Decimal(12, 2)
  workSchedule       String?   @map("work_schedule")
  registrationNumber String?   @map("registration_number")

  bankName               String?  @map("bank_name")
  bankAgency             String?  @map("bank_agency")
  bankAccount            String?  @map("bank_account")
  transportVoucherOptIn  Boolean? @map("transport_voucher_opt_in")
  dependents             Json?    @map("dependents")

  admissionExamDate   DateTime? @map("admission_exam_date") @db.Date
  admissionExamResult String?   @map("admission_exam_result")

  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)

  createdJobs         Job[]                @relation("JobCreatedBy")
  trainingAssignments TrainingAssignment[]
  exit                EmployeeExit?        @relation("ExitUser")
  processedExits      EmployeeExit[]       @relation("ExitCreatedBy")
  documents           EmployeeDocument[]

  @@unique([companyId, email])
  @@unique([companyId, cpf])
  @@index([companyId])
  @@index([companyId, active])
  @@map("users")
  @@schema("public")
}

model Job {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  companyId      String   @map("company_id") @db.Uuid
  title          String
  description    String
  department     String?
  location       String?
  workMode       String   @map("work_mode")
  employmentType String?  @map("employment_type")
  status         String   @default("DRAFT")
  publishedAt    DateTime? @map("published_at") @db.Timestamptz(6)
  resumeDeadline    DateTime? @map("resume_deadline") @db.Date
  interviewDeadline DateTime? @map("interview_deadline") @db.Date
  hiringDeadline    DateTime? @map("hiring_deadline") @db.Date
  expectedStartDate DateTime? @map("expected_start_date") @db.Date
  createdById    String?  @map("created_by") @db.Uuid
  createdAt      DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt      DateTime @default(now()) @map("updated_at") @db.Timestamptz(6)

  company    Company     @relation(fields: [companyId], references: [id], onDelete: Cascade)
  createdBy  User?       @relation("JobCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)
  candidates Candidate[]

  @@index([companyId])
  @@index([companyId, status])
  @@map("jobs")
  @@schema("public")
}

model Candidate {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  companyId   String   @map("company_id") @db.Uuid
  jobId       String   @map("job_id") @db.Uuid
  name        String
  email       String
  phone       String?
  linkedinUrl String?  @map("linkedin_url")
  resumePath  String?  @map("resume_path")
  stage       String   @default("TRIAGE")
  position    Int      @default(0)
  qualificationTag String? @map("qualification_tag")
  hiredAt     DateTime? @map("hired_at") @db.Timestamptz(6)
  processSteps Json?   @map("process_steps")
  notes       String?
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt   DateTime @default(now()) @map("updated_at") @db.Timestamptz(6)

  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  job     Job     @relation(fields: [jobId], references: [id], onDelete: Cascade)

  @@index([companyId])
  @@index([companyId, jobId])
  @@index([companyId, jobId, stage])
  @@map("candidates")
  @@schema("public")
}

model TrainingTrail {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  companyId   String   @map("company_id") @db.Uuid
  title       String
  description String?
  active      Boolean  @default(true)
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt   DateTime @default(now()) @map("updated_at") @db.Timestamptz(6)

  company     Company              @relation(fields: [companyId], references: [id], onDelete: Cascade)
  items       TrainingItem[]
  assignments TrainingAssignment[]

  @@index([companyId])
  @@map("training_trails")
  @@schema("public")
}

model TrainingItem {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  companyId   String   @map("company_id") @db.Uuid
  trailId     String   @map("trail_id") @db.Uuid
  title       String
  description String?
  contentType String   @map("content_type")
  url         String
  position    Int      @default(0)
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  company  Company            @relation(fields: [companyId], references: [id], onDelete: Cascade)
  trail    TrainingTrail      @relation(fields: [trailId], references: [id], onDelete: Cascade)
  progress TrainingProgress[]

  @@index([trailId, position])
  @@map("training_items")
  @@schema("public")
}

model TrainingAssignment {
  id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  companyId   String    @map("company_id") @db.Uuid
  userId      String    @map("user_id") @db.Uuid
  trailId     String    @map("trail_id") @db.Uuid
  assignedAt  DateTime  @default(now()) @map("assigned_at") @db.Timestamptz(6)
  completedAt DateTime? @map("completed_at") @db.Timestamptz(6)

  company  Company            @relation(fields: [companyId], references: [id], onDelete: Cascade)
  user     User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  trail    TrainingTrail      @relation(fields: [trailId], references: [id], onDelete: Cascade)
  progress TrainingProgress[]

  @@unique([userId, trailId])
  @@index([companyId, userId])
  @@index([trailId])
  @@map("training_assignments")
  @@schema("public")
}

model TrainingProgress {
  id             String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  companyId      String    @map("company_id") @db.Uuid
  assignmentId   String    @map("assignment_id") @db.Uuid
  trainingItemId String    @map("training_item_id") @db.Uuid
  completed      Boolean   @default(false)
  completedAt    DateTime? @map("completed_at") @db.Timestamptz(6)

  company    Company            @relation(fields: [companyId], references: [id], onDelete: Cascade)
  assignment TrainingAssignment @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
  item       TrainingItem       @relation(fields: [trainingItemId], references: [id], onDelete: Cascade)

  @@unique([assignmentId, trainingItemId])
  @@index([companyId, assignmentId])
  @@map("training_progress")
  @@schema("public")
}

model EmployeeExit {
  id             String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  companyId      String    @map("company_id") @db.Uuid
  userId         String?   @unique @map("user_id") @db.Uuid
  userName       String    @map("user_name")
  department     String?
  position       String?
  admissionDate  DateTime? @map("admission_date") @db.Date
  exitDate       DateTime  @map("exit_date") @db.Date
  exitType       String    @map("exit_type")
  reason         String
  notes          String?
  rehireEligible Boolean?  @map("rehire_eligible")
  createdById    String?   @map("created_by") @db.Uuid
  createdAt      DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)

  company   Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  user      User?   @relation("ExitUser", fields: [userId], references: [id], onDelete: SetNull)
  createdBy User?   @relation("ExitCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)

  @@index([companyId, exitDate])
  @@map("employee_exits")
  @@schema("public")
}

model KanbanStageLabel {
  id        String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  companyId String @map("company_id") @db.Uuid
  stage     String
  label     String

  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@unique([companyId, stage])
  @@map("kanban_stage_labels")
  @@schema("public")
}

model EmployeeDocument {
  id        String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  companyId String @map("company_id") @db.Uuid
  userId    String @map("user_id") @db.Uuid

  type     String
  fileName String @map("file_name")
  fileUrl  String @map("file_url")

  issueDate      DateTime? @map("issue_date") @db.Date
  expirationDate DateTime? @map("expiration_date") @db.Date
  notes          String?

  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([companyId, userId])
  @@index([companyId, expirationDate])
  @@map("employee_documents")
  @@schema("public")
}
```

## Migrations aplicadas (em ordem, todas já rodadas no banco real)

```
0001_colaborador_hr_fields.sql        campos da ficha de colaborador (RH)
0002_candidates_resume_optional.sql   resume_path vira opcional
0003_company_options_and_department.sql  tabela company_options + department
0004_candidate_qualification_tag.sql  tag de qualificação do candidato
0005_budget.sql                       [obsoleta] tabelas de budget (1ª versão) — removidas na 0014
0006_job_department.sql               department em jobs
0007_employee_exits_and_kpi_timestamps.sql  employee_exits + published_at/hired_at
0008_candidate_process_timeline.sql   process_steps (linha do tempo granular)
0009_budget_periods_and_status.sql    [obsoleta] budgets: competence → start/end/status — removida na 0014
0010_kanban_drag_and_drop.sql         candidates.position + kanban_stage_labels
0011_job_schedule_dates.sql           prazos de vaga (resume/interview/hiring/start)
0012_budget_category_option.sql       [obsoleta] amplia check de company_options pra CATEGORIA_BUDGET — revertida na 0015
0013_employee_documents.sql           tabela employee_documents (documento do colaborador)
0014_remove_payroll_timeclock_budget.sql  DROP time_clocks/payroll_variables/budgets/budget_expenses
0015_remove_categoria_budget_option.sql   apaga linhas CATEGORIA_BUDGET + estreita check constraint
```

As migrations `0005`, `0009` e `0012` ficam no histórico (não reescrever
migrations já aplicadas), mas o que elas criaram não existe mais — `0014` e
`0015` são as que reflitam o estado atual.

**Risco conhecido:** essas migrations são aplicadas manualmente uma a uma
(`npx prisma db execute --file ...`) e `supabase/schema.sql` é atualizado à
mão em paralelo — não há uma trilha automática garantindo que os dois nunca
divirjam. Se for padronizar algo, esse é um bom candidato (ex.: adotar
`prisma migrate` de verdade, ou um script que valida `schema.sql` contra o
banco real).

## Camada de serviços (`services/*.ts`) — só leitura

Todas são `server-only`, chamam `requireSession()`/`requireRole([...])` no
topo e filtram tudo por `companyId` da sessão (nunca de parâmetro).

| Arquivo | Funções | Domínio |
|---|---|---|
| `colaboradores.ts` | `listColaboradores`, `getColaborador` | Ficha de colaboradores |
| `jobs.ts` | `listJobs`, `getJob`, `listPublicOpenJobs`, `getPublicOpenJob` | Vagas (inclui rotas públicas) |
| `candidates.ts` | `listCandidates`, `getCandidate` | Candidatos |
| `employeeExits.ts` | `listEmployeeExits`, `listAllEmployeeExitsForKpis` | Desligamentos |
| `companyOptions.ts` | `listCompanyOptions`, `listAllCompanyOptions` | Listas configuráveis (setor, horário, modalidade) |
| `kanbanLabels.ts` | `getKanbanStageLabels` | Rótulos customizados do Kanban |
| `kpis.ts` | `getHrKpis` | 5 KPIs de RH (time-to-hire, turnover, turnover 90d, custo médio, funil) — o de desvio de orçamento saiu |

`services/budget.ts` **não existe mais** (removido na redução de escopo).

## Camada de mutação (`app/**/actions.ts`) — Server Actions

**Convenção obrigatória**: arquivo com `"use server"` na primeira linha,
só exporta Server Actions (nada de função helper solta no mesmo arquivo,
nem `import "server-only"` junto) — misturar isso quebra o build quando um
Client Component importa a action. Por isso toda leitura fica em
`services/*.ts` (sem `"use server"`) e toda escrita em `actions.ts` ao lado
da rota que usa.

| Arquivo | Actions |
|---|---|
| `colaboradores/actions.ts` | `createColaborador`, `updateColaborador`, `deleteColaborador` |
| `recrutamento/vagas/actions.ts` | `createJob`, `updateJob`, `setJobStatus` |
| `recrutamento/candidatos/actions.ts` | `createCandidateManual`, `moveCandidateStage`, `moveCandidateInKanban`, `setKanbanStageLabel`, `setCandidateTag`, `toggleProcessStep`, `updateCandidateDados`, `addCandidateNote` |
| `desligamentos/actions.ts` | `createEmployeeExit` |
| `configuracoes/actions.ts` | `createCompanyOption`, `deleteCompanyOption` |
| `empresa/[slug]/vagas/[jobId]/actions.ts` | `applyToJob` (candidatura pública) |

`gestao/budget/actions.ts` **não existe mais** (removido junto com a rota).

## Autenticação / sessão (`lib/session.ts`)

```ts
type Session = { userId, companyId, role: "ADMIN"|"HR"|"EMPLOYEE", name, email }

getSession()      // lê o usuário do Supabase Auth, busca o User no Postgres
                   // pelo mesmo id, retorna null se não achar ou active=false
requireSession()   // redirect /login se não autenticado
requireRole(roles) // redirect /dashboard se role não permitida
```

Toda página/Server Action que precisa de dados começa chamando uma dessas
três — é a **única** fonte de `companyId` usada em qualquer query. Nunca há
`companyId` vindo de formulário, query string ou body.

## Padrões de modelagem já em uso (relevantes pra discutir padronização)

- **Texto livre em vez de enum de banco** pra `department`, `status`
  (job/exit), `role`, `stage` (candidate), `type` (employee_document).
  Nenhum é um Postgres enum real — validação de valores permitidos fica só
  no Zod (`schemas/*.ts`) e, no caso de `company_options.category`, num
  `check constraint` no banco (que precisa ser mantido manualmente em
  sincronia com o Zod — foi exatamente esse check que teve que ser
  alterado duas vezes, nas migrations `0012` e `0015`, por causa da
  categoria de budget entrando e saindo).
- **Campos "foto" que sobrevivem à entidade original**: `EmployeeExit`
  guarda `userName`/`department`/`position`/`admissionDate` duplicados do
  `User` no momento do desligamento, porque `userId` pode virar `null`
  (`onDelete: SetNull`) se o colaborador for excluído de verdade depois —
  histórico de turnover não pode sumir.
- **`CompanyOption`** é um modelo genérico (`category` + `label`) reusado
  pra 3 categorias diferentes hoje (SETOR, HORARIO_TRABALHO,
  MODALIDADE_CONTRATACAO) em vez de uma tabela por categoria — ver
  `services/companyOptions.ts`. (Chegou a ter uma 4ª categoria,
  CATEGORIA_BUDGET, removida na redução de escopo.)
- **`position: Int`** em `Candidate` (ordem manual dentro da coluna do
  Kanban) e em `TrainingItem` (ordem dos itens da trilha) — mesmo padrão de
  reordenação manual nos dois lugares.
- **Path em vez de binário pra arquivo**: tanto `Candidate.resumePath`
  quanto `EmployeeDocument.fileUrl` guardam um caminho pensado pro Supabase
  Storage, não o arquivo em si. **Nenhum dos dois tem o fluxo de upload
  implementado ainda** — é a mesma infraestrutura faltando (bucket, action,
  UI) em dois lugares diferentes; vale resolver os dois juntos quando for
  implementar.
- **Multi-tenant majoritariamente na aplicação**: toda tabela de negócio
  tem `company_id` denormalizado (inclusive onde seria derivável via
  join), e todo `findMany`/`findUnique`/`update` em `services`/`actions`
  inclui esse filtro explicitamente. RLS está ativo só em parte das
  tabelas (ver seção "Stack de dados" acima) — não é proteção completa no
  nível do banco ainda.

## O que está fora do schema.prisma atual (ainda não implementado)

- Upload real de arquivo pro Supabase Storage (currículo de candidato,
  documento de colaborador) — os dois campos existem, o fluxo não.
- Folha de pagamento completa, banco de horas, ponto — removidos do escopo
  do produto (não é "ainda não implementado", é decisão de escopo).
- Convite por magic link, exportações CSV/XLSX/PDF — nunca chegaram a
  existir no repositório, mencionados só na spec original
  (`ARCHITECTURE.md`).

# Auditoria técnica e funcional — Inspect Talent

Data: 2026-09-30 · Commit auditado: `3022389` (branch `main`, árvore limpa) · Modo: somente leitura.
Base: código real do repositório (docs `CONTEXT.md`/`ARCHITECTURE.md`/`BACKEND_CONTEXT.md` usados só para apontar divergências).
Convenção: `[INCERTO]` = não foi possível confirmar lendo o código (depende de estado do banco/painel Supabase/Vercel ou de comportamento de runtime).

---

## Resumo executivo

1. ATS multi-tenant (Next 14.2.35 + Prisma 7.10 + Supabase) com recrutamento funcional de ponta a ponta: vagas, página pública, candidatura, Kanban, banco de talentos, entrevistas, DISC. Os outros módulos (colaboradores, desligamentos, KPIs) funcionam mas estão fora do menu. Desenvolvimento/trilhas é só placeholder.
2. O isolamento entre empresas é feito no código (filtro manual por `companyId`) e está correto na maioria das actions. Há **IDOR confirmado** em `updateAssessment`/`deleteAssessment` (sistema legado de testes): um usuário de uma empresa consegue editar ou apagar testes de outra.
3. **Risco crítico provável `[INCERTO]`:** 7 tabelas criadas por migrations (`applications`, `application_events`, `notifications`, `employee_exits`, `company_options`, `kanban_stage_labels`, `employee_documents`) não têm `enable row level security` nem `revoke`. Com os grants padrão do Supabase, a chave anon (pública, vai para o navegador) pode ler e gravar nelas via API REST.
4. **Escalada de privilégio:** um usuário HR consegue se promover a ADMIN, ou trocar o e-mail de um ADMIN, via `updateColaborador`/`createColaborador`.
5. Várias funcionalidades anunciadas não funcionam de verdade em produção:
   - e-mails de entrevista: nenhum template é criado, então nada é enviado, sem aviso;
   - DISC para empresas novas: o registro só é criado por script manual;
   - triagem por IA para candidatos reais: não há consentimento nem chave liga/desliga;
   - recuperação de senha: não existe tela de retorno do link;
   - limites de plano: não são aplicados.
6. LGPD: a candidatura pública não coleta consentimento nem mostra aviso de privacidade. PDFs de candidatos e de empresas excluídas ficam órfãos no Storage. O `email_logs` guarda o corpo dos e-mails para sempre. Não há rate limit nem captcha nas rotas públicas.
7. A fila em background depende de `pg_cron` + `pg_net` configurados manualmente no Supabase (`supabase/cron/process_tasks.sql`). O `vercel.json` não tem cron. Se o SQL não foi aplicado em produção `[INCERTO]`, e-mails e IA ficam parados em `pending`.
8. Qualidade: `tsc --noEmit` passa sem erros; 99/99 testes unitários passam (cobrem só `lib/ai`, `lib/tasks`, `lib/resumes/files`); lint não está configurado. Há código morto (sistema de testes legado, `app/components/assessments/*`, `AssessmentLinkButton`, `exemplo-sidebar`) e 2 scripts quebrados (`seed-demo-data.js`, `backfill-budget-categories.js`).

---

## 1. Visão geral e stack

### 1.1 Versões (package.json → versão instalada em node_modules)

| Pacote | Declarado | Instalado | Uso |
|---|---|---|---|
| next | ^14.2.15 | 14.2.35 | App Router, Server Actions |
| react / react-dom | ^18.3.1 | 18.3.1 | |
| @prisma/client / prisma | ^7.10.0 | 7.10.0 | ORM, com `@prisma/adapter-pg` + `pg` 8.23 (driver adapter obrigatório no Prisma 7) |
| @supabase/supabase-js | ^2.116.0 | 2.116.0 | Auth admin, Storage |
| @supabase/ssr | ^0.12.7 | 0.12.7 | sessão por cookie |
| resend | ^6.30.0 | 6.30.0 | e-mail transacional (`lib/email.ts`) |
| zod | ^4.6.5 | 4.6.5 | validação |
| tailwindcss | ^3.4.13 | 3.4.19 | utilitários (parcial) |
| framer-motion | ^13.4.4 | 13.4.4 | `PageTransition`/animações |
| lucide-react | ^0.454.0 | 0.454.0 | ícones |
| @dnd-kit/* | 6.3 / 10.0 / 3.2 | | drag-and-drop do Kanban |
| unpdf | ^1.8.1 | 1.8.1 | extração de texto de PDF (`lib/ai/extract.ts`) |
| typescript | ^5.6.3 | 5.9.3 | |
| vitest | ^4.1.11 | 4.1.11 | testes |
| IA | — | — | sem SDK: chamadas `fetch` diretas a Gemini (`lib/ai/providers/gemini.ts`, Interactions API) e OpenAI (`lib/ai/providers/openai.ts`) |

### 1.2 Estrutura de pastas

| Pasta | Responsabilidade |
|---|---|
| `app/` | Rotas (App Router). `(dashboard)/` = área logada (layout exige sessão). `api/` = Route Handlers. `actions/` = Server Actions compartilhadas. `components/` (dentro de app!) = componentes de avaliação pública/legado. `empresa/`, `avaliacao/`, `cadastro/`, `login/`, `recuperar-senha/`, `trocar-senha/` = rotas fora do dashboard. `exemplo-sidebar/` = rascunho. |
| `components/` | UI: `ui/` (primitivas), `layout/` (Sidebar, Header, busca, sino), `recrutamento/` (28 componentes), `admin/`, `colaboradores/`, `configuracoes/`, `desligamentos/`, `inicio/`, `auth/`, `examples/` (rascunho) |
| `lib/` | Infra/domínio: `session.ts`, `prisma.ts`, `supabase/`, `ai/` (config, providers, redação, prompt), `screening/` (orquestração da análise), `tasks/` (fila), `resumes/` (versionamento/retenção), `disc/`, `email.ts`, `plans.ts`, `actions/` (Server Actions de testes/DISC — misturadas em lib) |
| `services/` | Leituras server-only filtradas por `companyId` da sessão (jobs, candidates, applications, kpis etc.) |
| `schemas/` | Zod: `candidate.ts` (stages, tags), `job.ts`, `colaborador.ts`, `employeeExit.ts`, `userInvite.ts` |
| `prisma/` | `schema.prisma` escrito à mão (não introspectado) |
| `supabase/` | `schema.sql` (dump de referência — desatualizado), `migrations/0001…0034`, `cron/process_tasks.sql` (não é migration), `backups/` (CSVs de budget) |
| `scripts/` | seeds/backfills/dev (ver 1.3) |
| `tests/` | `unit/` (6 arquivos), `db/` (3 arquivos + helpers, exigem banco de teste) |

### 1.3 Scripts npm (`package.json`)

| Script | Comando | O que faz |
|---|---|---|
| dev | `next dev` | servidor de desenvolvimento em localhost:3000 |
| dev:lan | `next dev -H 0.0.0.0` | mesmo, escutando na rede local. Só funciona para IPs listados em `allowedDevOrigins` (`next.config.mjs`: 192.168.2.104, 192.168.2.166) |
| build / start | `next build` / `next start` | |
| lint | `next lint` | **não configurado**: não há `.eslintrc`, então o comando abre um assistente interativo (ver §9) |
| test | `vitest run --project unit` | `tests/unit/**` |
| test:db | `vitest run --project db` | `tests/db/**` contra `TEST_DATABASE_URL` (apaga a fila; não executado nesta auditoria) |
| test:db:setup | `node scripts/setup-test-db.js` | aplica `schema.sql` + migrations faltantes no banco de teste |
| tasks:dev | `node scripts/tasks-dev.js` | a cada 15 s faz `POST /api/cron/tasks` com `Bearer CRON_SECRET` (substitui o pg_cron em dev). URL configurável por `TASKS_DEV_URL` |
| postinstall | `prisma generate` | |

Outros scripts (sem entrada npm): `scripts/seed-admin.js`, `scripts/seed-demo-data.js` (**quebrado**), `scripts/seedDisc.ts` (cria o DISC das empresas; **roda só à mão**), `scripts/backfill-resume-versions.js`, `scripts/backfill-budget-categories.js` (**obsoleto/quebrado**), `scripts/setup-test-db.js`, `scripts/tasks-dev.js`.

### 1.4 Variáveis de ambiente (só nomes)

| Variável | Onde é lida |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `lib/supabase/{client,server,admin}.ts`, `app/actions/submitAssessment.ts`, `scripts/seed-admin.js`, `scripts/seed-demo-data.js`, `scripts/backfill-resume-versions.js` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `lib/supabase/client.ts`, `lib/supabase/server.ts` (é pública por natureza; ver risco de RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | `lib/supabase/admin.ts`, `app/actions/submitAssessment.ts`, `scripts/seed-admin.js`, `scripts/seed-demo-data.js`, `scripts/backfill-resume-versions.js` |
| `DATABASE_URL` | `lib/prisma.ts` (transaction pooler), `scripts/seed-admin.js`, `scripts/seed-demo-data.js`, `scripts/seedDisc.ts`, `scripts/backfill-budget-categories.js` |
| `DIRECT_URL` | `prisma.config.ts` (CLI), `scripts/backfill-resume-versions.js` |
| `CRON_SECRET` | `app/api/cron/tasks/route.ts`, `app/(dashboard)/recrutamento/banco-de-talentos/aiActions.ts` (`triggerQueueNow`), `scripts/tasks-dev.js` |
| `AI_PROVIDER`, `AI_MODEL`, `AI_ALLOW_REAL_DATA`, `GEMINI_API_KEY`, `OPENAI_API_KEY` | `lib/ai/config.ts` (`parseAiConfig(process.env)`; a chave é lida dinamicamente via `env[keyVar]`) |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | `lib/email.ts` (**ausentes do `.env.example`**) |
| `NODE_ENV` | `lib/email.ts` (remetente), `lib/prisma.ts` |
| `VERCEL_URL` | `app/avaliacao/[token]/page.tsx` (self-fetch) |
| `VERCEL_REGION` | `app/api/cron/tasks/route.ts` (id do worker) |
| `TEST_DATABASE_URL` / `TEST_DIRECT_URL` | `tests/db/helpers.ts` / `scripts/setup-test-db.js` |
| `TASKS_DEV_URL` | `scripts/tasks-dev.js` |
| `SEED_COMPANY_NAME`, `SEED_COMPANY_SLUG`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NAME` | `scripts/seed-admin.js` (`SEED_COMPANY_SLUG` também em `seed-demo-data.js`) |

`.env.local` e `.env` estão no `.gitignore` e **não** são versionados (`git ls-files` só mostra `.env.example`). Nenhum segredo hardcoded foi encontrado em arquivo versionado. As varreduras por padrões JWT, `sk-`, `re_`, `AIza` e connection strings `postgres://user:pass@` só deram falsos positivos (nomes de coluna).

---

## 2. Mapa de rotas e telas

Legenda de status: **Real** = funcional com dados reais · **Parcial** · **Placeholder** · **Órfã** (existe, mas nenhum link do menu leva até ela) · **Legado** · **Redirect**.
"SC" = Server Component, "CC" = Client Component. A Sidebar (`components/layout/Sidebar.tsx`) só mostra: Início, Recrutamento (Vagas, Banco de Talentos, DISC), Configurações e, para SUPERADMIN, Empresas/Parceiros. Ela **não filtra por role**: EMPLOYEE vê "Recrutamento" e é redirecionado ao clicar.

### 2.1 Páginas públicas

| Rota | Tipo | Acesso | O que faz / fonte | Status |
|---|---|---|---|---|
| `/` (`app/page.tsx`) | SC | todos | Landing provisória ("Placeholder da Fase 1"). Texto cita "treinamento, **ponto** e informações da **folha**" e botão "Ver dashboard (placeholder)" | Placeholder, com resquício de escopo removido |
| `/login` | CC | todos | `supabase.auth.signInWithPassword` no browser. Bullets citam "ponto e folha" e "Ponto validado pelo servidor" | Real (texto desatualizado) |
| `/cadastro` | CC | todos | `POST /api/public/signup` e depois login automático | Real |
| `/recuperar-senha` | CC | todos | `resetPasswordForEmail(email)` **sem `redirectTo`** e sem rota de callback | Parcial/quebrado (ver §5) |
| `/trocar-senha` | SC + CC | logado com `mustChangePassword` | `changePassword` (`app/trocar-senha/actions.ts`) | Real |
| `/empresa/[slug]/vagas` | SC | todos | `listPublicOpenJobs` (`services/jobs.ts`): empresa ativa, vagas `OPEN` | Real |
| `/empresa/[slug]/vagas/[jobId]` | SC + `ApplyForm` (CC) | todos | `getPublicOpenJob` + action `applyToJob` | Real |
| `/avaliacao/[token]` | SC + `DiscForm` (CC) | quem tem o token | Faz fetch da própria `/api/avaliacao/[token]` via `VERCEL_URL`. Submissão por `submitDiscAssessment` | Real (Tailwind cru) |
| `/avaliacao/[token]/sucesso` | SC | quem tem o token | Lê `DiscResponse` por token e **mostra todos os scores ao candidato**, sem checar expiração | Real |
| `/exemplo-sidebar` | SC | **todos, sem login** | Renderiza `components/examples/AccordionSidebar.tsx`. Não é usado em nada | Rascunho/órfã |

### 2.2 Área logada — grupo `app/(dashboard)` (layout exige `requireSession()` e força `/trocar-senha` se `mustChangePassword`)

| Rota | Tipo | Quem acessa (onde é checado) | Lê/escreve | Status |
|---|---|---|---|---|
| `/dashboard` | SC | qualquer sessão | SUPERADMIN: contagens globais (users, partners, companies, `groupBy plan`). Demais: `listActivePartners` + `getCompanyPlan` → carrossel de parceiros | Real |
| `/admin/empresas` | SC | SUPERADMIN (`listAllCompanies` → `requireRole(["SUPERADMIN"])`) | `companies` + contagens; criar/alternar/excluir/trocar plano (`app/actions/adminCompanies.ts`) | Real |
| `/admin/parceiros` | SC | SUPERADMIN (`listPartners`) | CRUD `partners`, upload em bucket público `partners` | Real |
| `/recrutamento` | SC | ADMIN/HR (`requireRole` na página) | Painel: contagens de vagas/candidaturas, gargalos (`jobs`, `applications`) | Real |
| `/recrutamento/vagas` | SC | ADMIN/HR (via `listJobs`) | `jobs` + contagem de candidaturas | Real |
| `/recrutamento/vagas/[jobId]` | SC + Kanban (CC) | ADMIN/HR | `getJob` (filtra `companyId`), Kanban (`moveCandidateInKanban`), `setJobStatus`, labels, snippets IA | Real |
| `/recrutamento/vagas/[jobId]/candidaturas/[applicationId]` | SC | ADMIN/HR (`getApplication`) | Abas Entrevista / Processo / DISC / Histórico; `interviews`, `disc_responses`, `application_events` | Real |
| `/recrutamento/banco-de-talentos` | SC | ADMIN/HR (`listCandidates`) | Lista de pessoas/candidaturas com filtros por vaga, etapa, tag e skill | Real |
| `/recrutamento/banco-de-talentos/[candidateId]` | SC | ADMIN/HR (`getPerson`) | Perfil, versões de currículo (URL assinada de 300 s), card de IA, candidaturas. Aba "Documentos" [INCERTO se tem conteúdo] | Real |
| `/recrutamento/candidatos`, `/recrutamento/candidatos/[candidateId]` | SC | — | Redirect para banco-de-talentos | Redirect (legado de nome) |
| `/recrutamento/disc` | SC | ADMIN/HR | `disc_assessments`/respostas da empresa | Real (vazio se o seed não rodou) |
| `/recrutamento/disc/perguntas` | SC | ADMIN/HR | Edita o texto das 60 perguntas (`app/actions/discQuestions.ts`) | Real |
| `/recrutamento/testes` (+ `/novo`, `/[id]/editar`) | SC/CC | ADMIN/HR (via `lib/actions/assessments.ts`, `requireRole` **dentro de try/catch**: o redirect vira mensagem de erro) | CRUD `assessments`/`assessment_questions`/`assessment_choices` | **Legado + órfã** (fora do menu; Tailwind cru; IDOR, ver §6) |
| `/colaboradores`, `/novo`, `/[id]/editar` | SC + form CC | ADMIN/HR (services/actions) | `users` (ficha RH completa), Auth admin | Real, **órfã** (fora do menu; só alcançável pela busca global do header ou pela URL) |
| `/desligamentos` | SC | ADMIN/HR | `employee_exits` + inativa `users` | Real, **órfã** |
| `/gestao/kpis` | SC | ADMIN/HR (`getHrKpis`) | turnover, time-to-hire | Real, **órfã** |
| `/desenvolvimento/trilhas`, `/desenvolvimento/progresso` | SC | qualquer sessão (sem checagem de role) | Só `EmptyState` estático; `training_*` não é lido em lugar nenhum | Placeholder, órfã |
| `/configuracoes` | SC | qualquer sessão (`requireSession`); cards de Usuários/Tarefas só para ADMIN | `company_options` (setor, horário, modalidade) | Real. **Não tem a chave "Triagem com IA"** |
| `/configuracoes/usuarios` | SC | ADMIN | `inviteUser` (HR/EMPLOYEE, senha temporária exibida na tela) | Real |
| `/configuracoes/tarefas` | SC | ADMIN | `background_tasks` da empresa + "Tentar novamente" | Real |
| `/configuracoes/planos` | SC | ADMIN | `lib/plans.ts` (preços PLACEHOLDER; "Assinar" só mostra aviso) | Parcial (sem cobrança) |
| `loading.tsx` | — | — | spinner de rota | — |

### 2.3 API Routes

| Rota | Método | Auth | O que faz | Status |
|---|---|---|---|---|
| `/api/public/signup` | POST | nenhuma | Cria Auth user (`email_confirm: true`) + `companies` + `users` ADMIN. Validação manual (sem zod) | Real |
| `/api/search` | GET | `getSession`, ADMIN/HR | busca `users`/`jobs`/`candidates` da empresa | Real |
| `/api/analysis/[analysisId]/status` | GET | `getSession`, ADMIN/HR, filtra `companyId` | polling do status de uma análise de IA | Real |
| `/api/avaliacao/[token]` | GET | token | perguntas DISC (se o token não foi usado e não expirou) | Real |
| `/api/cron/tasks` | POST | `Bearer CRON_SECRET` (tempo constante, `lib/tasks/cronAuth.ts`); 503 sem segredo | `processTasks` | Real |

### 2.4 Server Actions

| Arquivo | Funções |
|---|---|
| `app/actions/adminCompanies.ts` | `listAllCompanies`, `createCompanyWithAdmin`, `updateCompanyPlan`, `deleteCompany`, `toggleCompanyActive` |
| `app/actions/partners.ts` | `listPartners`, `listActivePartners`, `createPartner`, `updatePartner`, `deletePartner`, `reorderPartners` |
| `app/actions/uploadPartnerImage.ts` | `uploadPartnerImage` |
| `app/actions/discQuestions.ts` | `updateDiscQuestion`, `resetDiscQuestions` |
| `app/actions/scheduleInterview.ts` | `scheduleInterview`, `sendInterviewLink`, `cancelInterview`, `deleteInterview` |
| `app/actions/submitDiscAssessment.ts` | `submitDiscAssessment` (pública) |
| `app/actions/submitAssessment.ts` | `submitAssessment` (pública, **legado/morta**: só é importada por `app/components/assessments/AssessmentForm.tsx`, que não é importado por ninguém) |
| `app/empresa/[slug]/vagas/[jobId]/actions.ts` | `applyToJob` (pública) |
| `app/trocar-senha/actions.ts` | `changePassword` |
| `app/(dashboard)/recrutamento/vagas/actions.ts` | `createJob`, `updateJob`, `deleteJob`, `setJobStatus` |
| `app/(dashboard)/recrutamento/banco-de-talentos/actions.ts` | `createCandidateManual`, `moveCandidateStage`, `moveCandidateInKanban`, `setKanbanStageLabel`, `setCandidateTag`, `addApplicationNote`, `updateCandidateDados`, `uploadCandidateResume`, `setCandidateTestFlag`, `deleteCandidate` |
| `app/(dashboard)/recrutamento/banco-de-talentos/aiActions.ts` | `requestCandidateAnalysis`, `updateAnalysisSkills` |
| `app/(dashboard)/colaboradores/actions.ts` | `createColaborador`, `updateColaborador`, `deleteColaborador` |
| `app/(dashboard)/configuracoes/actions.ts` | `createCompanyOption`, `deleteCompanyOption` |
| `app/(dashboard)/configuracoes/usuarios/actions.ts` | `inviteUser` |
| `app/(dashboard)/configuracoes/tarefas/actions.ts` | `retryBackgroundTask` |
| `app/(dashboard)/desligamentos/actions.ts` | `createEmployeeExit` |
| `components/layout/notificationActions.ts` | `listNotifications`, `markNotificationRead`, `markAllNotificationsRead`, `clearNotifications` |
| `lib/actions/assessments.ts` | `createAssessment`, `getAssessments`, `getAssessmentById`, `updateAssessment`, `deleteAssessment` (legado) |
| `lib/actions/generateAssessmentLink.ts` | `generateAssessmentLink` (**órfã**: só usada por `AssessmentLinkButton`, que também é órfão) |
| `lib/actions/updateJobAssessment.ts` | `updateJobAssessment` (**órfã**: nenhum chamador) |
| `lib/actions/generateDiscLink.ts` | `generateDiscLink` |

### 2.5 Resquícios de módulos fora de escopo (folha, ponto, budget, dashboard antigo)

- **Texto de UI:** `app/page.tsx` ("ponto e informações da folha"); `app/login/page.tsx` (bullets "Recrutamento, treinamento, ponto e folha", "Ponto validado pelo servidor…").
- **Comentário:** `app/(dashboard)/colaboradores/actions.ts` (`deleteColaborador`) cita "tabelas de ponto/treinamento/folha".
- **Scripts:** `scripts/seed-demo-data.js` (`seedBudgets`, `prisma.budget`, `prisma.budgetExpense`, `Candidate.jobId`) e `scripts/backfill-budget-categories.js` (categoria `CATEGORIA_BUDGET`, removida na migration 0015).
- **Dados:** `supabase/backups/budgets_*.csv` e `budget_expenses_*.csv`, versionados no git.
- **Docs:** `ARCHITECTURE.md` ainda descreve `/ponto`, `/folha/*`, `/meu-ponto` e as fases 7–9 de ponto/folha/exportação.
- **Sidebar:** não sobrou nenhum item de folha/ponto/budget. O grupo "Desenvolvimento" (trilhas) e o antigo "dashboard geral" também não aparecem; `/dashboard` hoje é a "Início".
- **Chave de localStorage** `inspect-human:sidebar-collapsed` (nome antigo), lida só para migração em `Sidebar.tsx`.

---

## 3. Funcionalidades de negócio ponta a ponta

### 3.1 Vagas

- **Criação e edição:** `createJob`/`updateJob` (`app/(dashboard)/recrutamento/vagas/actions.ts`), com Zod `jobSchema` (`schemas/job.ts`). Status `DRAFT|OPEN|CLOSED` (há check constraint no banco). `publishedAt` é gravado na primeira abertura.
- **Exclusão:** `deleteJob` apaga de vez (cascade apaga candidaturas). O comentário diz que só é oferecida para vagas CLOSED na UI, mas a action **não verifica o status**.
- **Página pública:** `/empresa/[slug]/vagas[/jobId]` só mostra empresa `active` e vaga `OPEN` (`services/jobs.ts`).
- **Candidatura pública:** `applyToJob`.
  1. Valida com Zod (nome, e-mail, telefone de 10–11 dígitos, LinkedIn opcional sem validar formato). O PDF é opcional (≤ 5 MB, `type === application/pdf`).
  2. Procura `Candidate` pelo e-mail dentro da empresa. Se não existe, cria.
  3. Cria `Application` (stage `TRIAGE`), o evento `APPLICATION_CREATED` e uma `Notification`.
  4. Salva a versão do currículo (`storeResumeVersion`), que também enfileira a análise de IA se ela estiver liberada.
- **O que não existe:** checkbox de consentimento, aviso de privacidade, bloqueio de candidatura duplicada à mesma vaga, rate limit e captcha.

### 3.2 Kanban / pipeline

- **Etapas** (`schemas/candidate.ts`, `CANDIDATE_STAGES`, nesta ordem): `TRIAGE, INTERVIEW, TEST, PROPOSAL, HIRED, REJECTED`.
  - Rótulos: Triagem, Entrevista, Teste, Proposta, Contratado, Reprovado. Podem ser personalizados por empresa (`kanban_stage_labels`).
  - `PIPELINE_STAGES` = todas menos `REJECTED`. `TERMINAL_STAGES` = `HIRED`, `REJECTED`.
  - Não há check constraint de `stage` no banco (migration 0018).
- **Tags de qualificação:** `GREEN` (Perfil compatível), `BLUE` (Banco de talentos), `RED` (Perfil incompatível).
- **Regras de transição** (`resolveTargetStage` em `banco-de-talentos/actions.ts`):
  - Sair de `TRIAGE` para frente sem tag `GREEN` vira **`REJECTED` automaticamente**, tanto pelo Kanban quanto pelo checklist, **sem diálogo de confirmação** (não há confirmação em `KanbanBoard.tsx`).
  - Marcar a tag `RED` move para `REJECTED` na mesma escrita (`setCandidateTag`).
  - Fora disso, **qualquer transição é permitida** (ex.: `HIRED`→`TRIAGE`).
  - `hiredAt` é gravado só na primeira vez que a candidatura chega a `HIRED`.
  - Etapa enviada pelo cliente não é validada em runtime (só no tipo TS).
- **Gatilhos automáticos:** só o evento `STAGE_CHANGED`. **Nenhum** e-mail sai por mudança de etapa. Entrar em `TEST` **não** gera link de DISC nem de teste, apesar do comentário em `supabase/migrations/0026_jobs_assessments.sql`. `HIRED` não cria colaborador.
- **Checklist:** é derivado 100% de `Application.stage` (`CandidateProcessChecklist.tsx`).

### 3.3 Banco de talentos

- `Candidate` representa a pessoa e é reaproveitado pelo e-mail dentro da empresa (sem unique no banco). `Application` é a candidatura.
- Lista em `services/candidates.ts`. Perfil com edição de dados (`updateCandidateDados` grava `PROFILE_UPDATED` só com os nomes dos campos alterados).
- Upload de nova versão de currículo pelo recrutador. Flag `isTest` (só ADMIN).
- `deleteCandidate` apaga a pessoa e todas as candidaturas, mas **os PDFs ficam no Storage** (o próprio `CONTEXT.md` reconhece isso em "Pendências conhecidas").

### 3.4 Triagem por IA

- **Caminho:** `lib/ai/*` (config, providers, redação, prompt) + `lib/screening/*` (request/analyze) + `lib/tasks/handlers/resumeAnalyze.ts`.
- **Provedor e modelo:** `AI_PROVIDER` = `mock` (padrão), `gemini` (Interactions API, `store:false`) ou `openai`. O modelo vem de `AI_MODEL` (nada fixo no código). Configuração inválida faz a análise falhar com `CONFIG`, sem cair em mock em silêncio.
- **Prompt:** `SCREENING_SYSTEM_PROMPT` (`lib/ai/screening.ts`, `PROMPT_VERSION = "2026-09-v2"`).
  - Proíbe nota, ranking, recomendação e inferência de atributos sensíveis.
  - A saída é um JSON com resumo, anos de experiência, competências (≤ 8), últimos cargos (≤ 3) e formação.
- **Dados enviados:** só o texto extraído do PDF, depois de `redactResumeText` (remove e-mail, URLs, @handles, CPF, RG, CEP/endereço, telefone, sequências numéricas longas, linhas de dados pessoais e o nome do candidato) e truncado em 12 000 caracteres. O PDF em si nunca é enviado.
- **Regra de disponibilidade** (`lib/ai/availability.ts`):
  - candidato `isTest` sempre passa;
  - para os demais, exige `AI_ALLOW_REAL_DATA=true`, depois `Company.aiScreeningEnabled`, depois um `Consent` ativo com purpose `AI_SCREENING`.
  - **Na prática só candidatos de teste são analisados:** (a) nenhum código grava `consents` (`grep` confirma: só há leitura em `lib/screening/request.ts`); (b) nenhum código grava `aiScreeningEnabled` (não há chave em Configurações).
- **Decisão automatizada:** o pipeline de IA não altera `stage` nem `qualificationTag` (comentário e código de `lib/screening/analyzeResume.ts`). Os eventos `AI_SUMMARY_*` ficam na linha do tempo. A decisão continua humana, registrada em `STAGE_CHANGED`/`TAG_CHANGED` com `actorId`.
- **Limite mensal do plano** (`aiResumeLimit`): definido em `lib/plans.ts`, mas **não é aplicado em lugar nenhum** (`getMonthlyAiUsage` existe e não é chamada).

### 3.5 Testes / DISC

**DISC (sistema atual):**

- **Estrutura:** um `DiscAssessment` por empresa com 60 `DiscQuestion` (36 de competências + 24 de D/I/S/C). É **criado só pelo `scripts/seedDisc.ts`** rodado à mão: empresas criadas depois (via `/cadastro` ou `/admin/empresas`) recebem "Avaliação DISC não encontrada para esta empresa" (`lib/actions/generateDiscLink.ts`).
- **Token:** `randomUUID()` sem hífens (122 bits), expira em 7 dias, 1 por candidatura (`application_id` unique). O uso único é garantido por `submittedAt`.
  - Se o link expirar sem resposta, `generateDiscLink` **devolve o mesmo token expirado** e não há como gerar outro pela UI.
  - A UI (`DiscSection.tsx`) mostra "expira em 0 dias".
- **Envio ao candidato:** manual. O recrutador copia o link; não há e-mail.
- **Cálculo** (`lib/disc/calculate.ts`):
  - score = `round(((média − 1) / 4) × 100, 1)` por dimensão;
  - nível geral: < 60 Baixo, < 80 Médio, senão Alto;
  - perfil: a dimensão dominante se a diferença para a 2ª for > 20 pontos, senão as duas maiores.
  - As dimensões vêm do banco, nunca do payload (`submitDiscAssessment`).
- **Exposição:** `/avaliacao/[token]/sucesso` mostra **ao candidato** todos os scores e o perfil, sem checar expiração (qualquer pessoa com a URL vê). O recrutador vê em `DiscSection`.
- **Edição das perguntas** (`updateDiscQuestion`): muda o texto sem versionar. Respostas antigas ficam associadas ao texto novo.

**Sistema genérico (legado):**

- `Assessment`/`AssessmentQuestion`/`AssessmentChoice`/`AssessmentResponse`/`AssessmentAnswer` + `Job.assessmentId`.
- O CRUD em `/recrutamento/testes` ainda funciona, mas nada gera link para o candidato (`AssessmentLinkButton` é órfão) e não há rota pública que responda a esses testes: `/api/avaliacao` hoje serve só o DISC.
- Tokens gerados com `Math.random()` (`generateAssessmentLink.ts`).
- `lib/assessments/client.ts` consulta `assessment_responses` pelo **client do browser** (falharia por causa do REVOKE; código morto).

### 3.6 Entrevistas (`app/actions/scheduleInterview.ts`)

- **Agendar:** `upsert` de `Interview` (1 por candidatura), data no futuro. Enfileira o e-mail "Convite Entrevista" **se existir** um `EmailTemplate` com esse nome e grava `INTERVIEW_SCHEDULED` **sem `actorId`**.
- **Reagendar:** o mesmo `upsert`, mas **não volta `status` para `SCHEDULED`**. Uma entrevista cancelada e depois reagendada continua `CANCELLED`, a menos que seja excluída antes.
- **Enviar link:** `sendInterviewLink` grava o link e enfileira "Link Entrevista" (se o template existir) + evento com actor.
- **Cancelar:** `cancelInterview` muda o status e grava o evento. **Não manda e-mail ao candidato.**
- **Excluir:** só se `CANCELLED`.
- **Autorização:** as quatro funções checam sessão e empresa, mas **não checam role** (EMPLOYEE da empresa consegue chamar).
- **Templates:** **nenhum código cria `email_templates`**. Sem inserção manual no banco, nenhum e-mail de entrevista é enviado, e a UI não avisa.

### 3.7 E-mail

- **Envio:** `lib/email.ts`.
  - `enqueueEmail` renderiza o template com `{{var}}` **sem escapar HTML** (o nome digitado pelo candidato no formulário público entra cru no corpo do e-mail).
  - Grava `email_logs` (destinatário, assunto e corpo completos) e enfileira `email.send`.
  - O handler (`lib/tasks/handlers/emailSend.ts`) chama `sendEmailViaResend`, **checa `result.success`**, marca `sent`/`failed` e, em caso de falha, lança `PermanentTaskError`: **sem retry** para erro de envio. A tarefa aparece em Configurações → Tarefas.
- **`sendEmailViaResend` nunca lança** (retorna `{success,error}`). Chamadores verificados:
  - `app/actions/adminCompanies.ts` → trata corretamente;
  - `lib/tasks/handlers/emailSend.ts` → trata corretamente.
  - Não há outros chamadores diretos. Os `try/catch` em `scheduleInterview.ts` envolvem `enqueueEmail`, que **pode** lançar (template/aplicação inexistente), então não são inúteis. **O padrão de falha silenciosa não se repete em outro lugar.** O caso silencioso real é o `if (template)` sem `else` em `scheduleInterview.ts`.
- **Remetente:** `RESEND_FROM_EMAIL`, ou `noreply@inspect-talent.com` em produção, ou `onboarding@resend.dev` fora de produção. O domínio de produção exige verificação no Resend [INCERTO se foi feita].
- **Retenção:** `email_logs` não tem retenção; a fila tem (done 30 d, failed 90 d, `lib/tasks/queue.ts`).

### 3.8 Colaboradores, desligamentos, documentos, trilhas

- **Colaboradores:** `createColaborador` cria o usuário no Auth (senha temporária de 12 hex exibida na tela) + ficha completa (CPF, dados bancários, salário, raça/cor, dependentes). `updateColaborador` também troca o e-mail no Auth. `deleteColaborador` apaga no Auth e o cascade apaga `users`. Tudo isso é **acessível a HR** (ver escalada, §6).
- **Desligamentos:** `createEmployeeExit` salva uma cópia dos dados do colaborador + inativa o usuário, em transação. Real.
- **Documentos** (`EmployeeDocument`): tabela sem nenhuma leitura/escrita no código (sem upload).
- **Trilhas** (`TrainingTrail/Item/Assignment/Progress`): tabelas sem uso; as páginas são placeholders.

### 3.9 Multi-tenant

- A empresa ativa é **sempre** `users.company_id` do usuário logado (`lib/session.ts`). **Não existe troca de empresa**: um e-mail no Auth é global, então uma pessoa pertence a uma única empresa.
- SUPERADMIN não tem empresa; ao tentar uma página de negócio, `requireRole` redireciona para `/admin/empresas`.
- Candidaturas: `company_id` é sobrescrito pelo trigger `applications_set_company_id` (migration 0018), derivado da vaga.

---

## 4. Modelo de dados

### 4.1 Tabelas (`prisma/schema.prisma`)

| Model (tabela) | `companyId` | Relações / cascades principais | Índices/uniques relevantes |
|---|---|---|---|
| Company (`companies`) | — | pai de todas as tabelas (Cascade); `aiScreeningChangedBy`→User SetNull | `slug` unique; `plan` texto sem CHECK |
| CompanyOption | sim | Cascade | unique (company, category, label) |
| User (`users`) | **nullable** (SUPERADMIN) | Company **SetNull** (0034); no banco, `users.id`→`auth.users` on delete cascade | unique (company, email), (company, cpf) |
| Job | sim | Cascade; `assessmentId`→Assessment SetNull; `createdBy` SetNull | (company), (company, status) |
| Candidate | sim | Cascade; `currentResume` SetNull | (company), (company, email), **sem unique de e-mail** |
| Application | sim | Candidate/Job Cascade; `resume` SetNull | (company, job, stage) etc. |
| CandidateResume | sim | Candidate Cascade | `storagePath` unique; (candidate, sha256) unique |
| ResumeAnalysis | sim | Resume Cascade | (resume, generation) unique |
| Consent | sim | Candidate/Application Cascade | (company, candidate, purpose) |
| ApplicationEvent | sim | Application Cascade; actor SetNull | (company, application), (company, createdAt) |
| TrainingTrail/Item/Assignment/Progress | sim | Cascade | — (sem uso) |
| EmployeeExit | sim | user SetNull (unique userId) | (company, exitDate) |
| KanbanStageLabel | sim | Cascade | unique (company, stage) |
| EmployeeDocument | sim | User Cascade | — (sem uso) |
| Notification | sim | Cascade | (company, createdAt), (company, read) |
| BackgroundTask | nullable (tarefa de sistema) | Cascade | `idempotencyKey` unique |
| Assessment / Question / Choice / Response / Answer | sim | Cascade | `token` unique (Response) |
| EmailTemplate | sim | Cascade | unique (company, name) |
| **EmailLog** | **não** | Application/Template Cascade | (application), (status), (createdAt) |
| **Interview** | **não** | Application Cascade; `scheduled_by`→`auth.users` só no SQL | `applicationId` unique |
| DiscAssessment | sim | Cascade | (company) |
| **DiscQuestion** | **não** (herda do assessment) | Assessment Cascade | (assessment) |
| DiscResponse | sim | Application Cascade | `applicationId`, `token` unique |
| DiscAnswer | sim | Response/Question Cascade | unique (response, question) |
| Partner | não (proposital, global) | — | (active, position) |

**Tabelas de negócio sem `company_id`** (sem contar `Partner`): `email_logs`, `interviews`, `disc_questions`.

- Hoje o isolamento delas é indireto (via join com `applications`/`disc_assessments`). Todo acesso encontrado passa antes pela checagem da aplicação-pai, e em `scheduleInterview.ts`/`discQuestions.ts` a checagem existe.
- Risco: **Médio/Baixo**. Qualquer query futura direta nessas tabelas precisa lembrar do join, e elas não podem ter policy RLS por `company_id` sem join.

### 4.2 `supabase/schema.sql` × migrations × `schema.prisma`: divergências

1. **Tabelas ausentes do `schema.sql`:** `email_templates`, `email_logs` (0027), `interviews` + colunas `modality`/`interviewer_name`/`guests`/`interview_link` (0028–0030), `disc_assessments`/`disc_questions`/`disc_responses`/`disc_answers` (0031), `partners` (0032). O desatualizado vai além de 0032–0034: vem desde 0027.
2. **`users.role` CHECK:** `schema.sql` tem `('ADMIN','HR','EMPLOYEE')`; a migration 0033 inclui `SUPERADMIN`.
3. **`users.company_id`:** `schema.sql` tem `not null … on delete cascade`; a migration 0034 e o Prisma deixam nullable com `on delete set null`.
4. **RLS:** `schema.sql` habilita RLS em 17 tabelas, mas **não** em `company_options`, `employee_exits`, `kanban_stage_labels`, `employee_documents`, `notifications`, `applications`, `application_events`. As migrations que criaram essas tabelas (0003, 0007, 0010, 0013, 0017, 0018, 0019) também **não** habilitam RLS nem fazem `revoke`. O comentário das migrations 0013/0017/0018/0019 diz literalmente "Sem RLS (padrão do projeto)". Ver risco crítico no §6.
5. **`interviews.modality`:** no SQL (0029) é `DEFAULT 'PRESENCIAL'` **sem `NOT NULL`**; no Prisma é `String` não-nulo. Uma linha com NULL quebraria a leitura tipada [INCERTO se existe].
6. **`interviews.scheduled_by`:** FK para `auth.users` no SQL; sem relação no Prisma (apenas informativo).
7. **`candidates.resume_path`:** marcado como legado; a migration de remoção prevista ainda não existe.
8. O comentário do Prisma "Espelha supabase/schema.sql" (linha 1) é **falso** para as tabelas de 0027+.
9. **CHECKs que existem no SQL e não no Prisma** (esperado, o Prisma usa String): `jobs.status`, `jobs.work_mode`, `email_logs.status`, `interviews.status`, `disc_answers.score 1–5`, `disc_questions.section`, `company_options.category`, `employee_exits.*`, `candidate_resumes.*`, `resume_analyses.*`, `background_tasks.status`.
10. **Sem CHECK no banco:** `companies.plan`, `applications.stage`, `applications.qualification_tag`, `application_events.type`, `notifications.type`, `consents.purpose`, `kanban_stage_labels.stage`.

---

## 5. Autenticação e autorização

### 5.1 Fluxo

- **Cadastro:** `/cadastro` → `POST /api/public/signup`.
  1. Cria o usuário no Auth com `email_confirm: true` (**e-mail nunca verificado**).
  2. Cria `companies` e depois `users` (ADMIN).
  3. Se falhar, **só o usuário do Auth é removido**. A empresa já criada fica órfã se a falha for no `user.create`: não há transação Prisma. Mesma coisa em `createCompanyWithAdmin`. **A afirmação de "atomicamente com rollback" é só parcialmente verdadeira.**
- **Login:** `signInWithPassword` no browser (`app/login/page.tsx`) grava os cookies `@supabase/ssr`.
- **Sessão:** `getSession()` (`lib/session.ts`, memoizada por `cache()`) = `supabase.auth.getUser()` (valida no servidor do Supabase) + `prisma.user.findUnique`.
  - Recusa usuário `active=false`.
  - SUPERADMIN: se passou mais de 2 h desde `last_sign_in_at`, faz `signOut` e retorna null.
  - **Não há `middleware.ts`**. O `setAll` de cookies em Server Components é engolido (`lib/supabase/server.ts`), então a renovação do token só é persistida quando ocorre em Server Action/Route Handler [INCERTO: pode causar logout aparente depois da expiração do access token, se o refresh só acontecer em Server Components].
- **Logout:** `supabase.auth.signOut()` no browser (`Sidebar.tsx`).
- **Recuperação de senha:** `resetPasswordForEmail(email)` sem `redirectTo`. Não existe rota de callback (`exchangeCodeForSession`/`verifyOtp`/`PASSWORD_RECOVERY` não aparecem no código) nem tela "definir nova senha" para quem não tem `mustChangePassword`. `/trocar-senha` redireciona para `/dashboard` se a flag for false. **O fluxo não se completa dentro do app** [INCERTO: depende da Site URL configurada no Supabase].
- **Senha temporária:** `inviteUser`, `createColaborador` e `createCompanyWithAdmin` marcam `mustChangePassword`. O bloqueio é só no layout `(dashboard)`: Server Actions não conferem a flag.
- **Checagem de role:** `requireRole` em services/actions/páginas (§2). A Sidebar não filtra por role, e isso é aceitável porque o servidor barra.

### 5.2 Matriz de autorização (server actions e API routes)

| Função / rota | Verifica sessão? | Verifica role? | Verifica que o recurso é da empresa? |
|---|---|---|---|
| `POST /api/public/signup` | não (pública) | n/a | n/a (cria um tenant novo) |
| `GET /api/search` | sim | sim (ADMIN/HR) | sim |
| `GET /api/analysis/[id]/status` | sim | sim (ADMIN/HR) | sim |
| `GET /api/avaliacao/[token]` | não (token) | n/a | token = posse |
| `POST /api/cron/tasks` | Bearer CRON_SECRET | n/a | n/a |
| `applyToJob` | não (pública) | n/a | empresa derivada de slug + vaga OPEN |
| `submitDiscAssessment` | não (token) | n/a | via token; perguntas do assessment do token |
| `submitAssessment` (legado) | não (token) | n/a | via token (service role) |
| `changePassword` | sim | n/a | próprio usuário |
| `createJob` / `updateJob` / `deleteJob` / `setJobStatus` | sim | ADMIN/HR | sim |
| `createCandidateManual` | sim | ADMIN/HR | sim (job da empresa) |
| `moveCandidateStage` / `moveCandidateInKanban` | sim | ADMIN/HR | sim (`updateMany` por companyId na reordenação) |
| `setKanbanStageLabel` | sim | ADMIN/HR | sim (grava na própria empresa; `stage` não validado) |
| `setCandidateTag` / `addApplicationNote` | sim | ADMIN/HR | sim |
| `updateCandidateDados` / `uploadCandidateResume` / `deleteCandidate` | sim | ADMIN/HR | sim |
| `setCandidateTestFlag` | sim | ADMIN | sim |
| `requestCandidateAnalysis` / `updateAnalysisSkills` | sim | ADMIN/HR | sim |
| `scheduleInterview` / `sendInterviewLink` / `cancelInterview` / `deleteInterview` | sim (`getSession`) | **não** (EMPLOYEE passa) | sim (`job.companyId`) |
| `generateDiscLink` | sim | ADMIN/HR | sim |
| `updateDiscQuestion` / `resetDiscQuestions` | sim | ADMIN/HR | sim |
| `createAssessment` / `getAssessments` / `getAssessmentById` | sim | ADMIN/HR | sim |
| **`updateAssessment`** | sim | ADMIN/HR | **NÃO** (IDOR) |
| **`deleteAssessment`** | sim | ADMIN/HR | **NÃO** (IDOR) |
| `generateAssessmentLink` (órfã) | sim | ADMIN/HR | sim (mas o check de response existente não filtra empresa) |
| `updateJobAssessment` (órfã) | sim | ADMIN/HR | sim |
| `createColaborador` | sim | ADMIN/HR | sim, **mas HR pode criar ADMIN** |
| `updateColaborador` | sim | ADMIN/HR | sim, **mas HR pode alterar role/e-mail de qualquer usuário, inclusive de si mesmo e de ADMIN** |
| `deleteColaborador` | sim | ADMIN/HR | sim (HR pode apagar ADMIN; TODO no código) |
| `inviteUser` | sim | ADMIN | sim (roles só HR/EMPLOYEE) |
| `createCompanyOption` / `deleteCompanyOption` | sim | ADMIN/HR | sim |
| `retryBackgroundTask` | sim | ADMIN | sim |
| `createEmployeeExit` | sim | ADMIN/HR | sim |
| `list/mark/clearNotifications` | sim | ADMIN/HR (senão lista vazia) | sim |
| `listAllCompanies` / `createCompanyWithAdmin` / `updateCompanyPlan` / `deleteCompany` / `toggleCompanyActive` | sim | SUPERADMIN | n/a (global) |
| `listPartners` / `create/update/delete/reorderPartners` / `uploadPartnerImage` | sim | SUPERADMIN | n/a (global) |
| `listActivePartners` | sim | qualquer | n/a |

### 5.3 Conexão Prisma e RLS

- **Conexão:** o Prisma conecta via `@prisma/adapter-pg` com `DATABASE_URL` (transaction pooler do Supabase; `lib/prisma.ts`). A CLI usa `DIRECT_URL` (`prisma.config.ts`). O usuário do banco é o de privilégio total e ignora RLS [INCERTO: se é `postgres` ou outra role; a string não foi lida].
- **RLS:** **não há nenhuma `create policy` em todo o repositório** (`grep` em `supabase/`). O modelo é "RLS ligado + revoke all" (nega tudo para anon/authenticated) nas tabelas listadas em `schema.sql` e nas migrations 0021, 0022, 0025, 0027, 0028, 0031, 0032.
- **As 7 tabelas do item 4.2.4 não têm nem RLS nem revoke no código versionado.**
- **Storage:** bucket `resumes` privado com URL assinada de 300 s (`banco-de-talentos/[candidateId]/page.tsx`). Bucket `partners` público (`getPublicUrl`).

---

## 6. Segurança e privacidade (LGPD)

### 6.1 Rotas públicas

| Aspecto | Situação |
|---|---|
| Validação de input | `applyToJob`: Zod (`applyToJobSchema`), `linkedinUrl` sem validação de formato. `signup`: validação manual (tipos, senha ≥ 8), sem zod, sem limite de tamanho dos campos. `submitDiscAssessment`: valida ids e notas 1–5 |
| Rate limiting | **nenhum** (não há middleware, headers nem lib de rate limit) |
| Captcha / honeypot | **nenhum** |
| Anti-spam de candidaturas | nenhum; a mesma pessoa pode se candidatar N vezes à mesma vaga; cada envio cria `Notification` e `Application` |
| Upload (currículo) | tipo pelo `File.type` (declarado pelo cliente) + tamanho ≤ 5 MB (`lib/resumes/files.ts`), e depois a assinatura `%PDF-` é conferida em `lib/resumes/versioning.ts:56` (`isPdfBuffer`); caminho `empresa/pessoa/<sha256>.pdf`, sem nome do usuário; bucket privado; URL assinada de 300 s |
| Upload (parceiro) | SUPERADMIN; aceita **SVG**; bucket **público**; extensão tirada do nome original |
| Sobrescrita de currículo | quem souber o e-mail de um candidato pode, pelo formulário público, enviar um PDF que vira a **versão atual** do perfil dessa pessoa na empresa (`applyToJob` → `storeResumeVersion`) |
| Enumeração | `signup` responde "Este e-mail já está cadastrado" |

### 6.2 Tokens públicos

| Token | Geração | Entropia | Expiração | Uso único |
|---|---|---|---|---|
| DISC (`disc_responses.token`) | `randomUUID()` sem hífens | ~122 bits | 7 dias (checada na API e no submit; **não** na página `/sucesso`) | sim (`submittedAt`); link expirado não é regenerado |
| Assessment legado | `Math.random().toString(36)` × 2 | baixa, não criptográfica | 7 dias | sim; um token expirado não respondido é devolvido de novo |
| Candidatura | não há token (formulário aberto por slug + jobId) | — | — | — |

### 6.3 Teste mental de IDOR (troca de ID na URL/payload)

- **Protegido:** `/recrutamento/vagas/[jobId]` (`getJob` filtra `companyId`), `/candidaturas/[applicationId]` (`getApplication` + checa `jobId`), `/banco-de-talentos/[candidateId]` (`getPerson`), `/colaboradores/[id]/editar` (`getColaborador`), `/recrutamento/testes/[id]/editar` (leitura filtrada), `/api/analysis/[id]/status`, todas as actions de candidatura, entrevista e DISC, e a vaga pública (a vaga precisa ser da empresa do slug).
- **Vulnerável:**
  - `updateAssessment(id)`: apaga as perguntas do teste de **outra empresa**, recria com `companyId` do atacante e altera o título.
  - `deleteAssessment(id)`: apaga o teste de outra empresa se ele ainda não tiver respostas.
  - Exige conhecer o UUID (não enumerável). Ainda assim é falha de isolamento.

### 6.4 Segredos e configuração

- Nenhum segredo hardcoded em arquivo versionado. `.env`/`.env.local` estão no `.gitignore`.
- `NEXT_PUBLIC_*`: só `SUPABASE_URL` e `SUPABASE_ANON_KEY` (corretos como públicos). Nenhuma chave privada com prefixo público.
- `triggerQueueNow` (`aiActions.ts`) monta a URL com `x-forwarded-host`/`host` da requisição e envia `Bearer CRON_SECRET` para ela. Se o host for manipulável, o segredo vaza [INCERTO: na Vercel o proxy normalmente define esses headers].
- O `CONTEXT.md` ("Pendências antes do primeiro cliente") registra que **`SUPABASE_SERVICE_ROLE_KEY`, a senha do banco de produção e a senha do administrador foram expostas fora do ambiente local e precisam ser trocadas** [INCERTO se já foram].
- **Headers de segurança/CSP/CORS:** nenhum configurado (`next.config.mjs` sem `headers()`, `vercel.json` só com `regions`). Não há CSP, HSTS explícito, `X-Frame-Options` nem `frame-ancestors`.

### 6.5 Dados pessoais / LGPD

- **Consentimento na candidatura:** **inexistente**. Não há checkbox nem texto de privacidade, e nenhum registro em `consents`, embora a tabela exista.
- **Base legal/transparência:** nenhum aviso do que é feito com o currículo, por quanto tempo e com quais terceiros.
- **Retenção:** só as versões **substituídas** de currículo são purgadas após 12 meses (valor "PROVISÓRIO — pendente de validação jurídica", `lib/resumes/retention.ts`). Candidatos, candidaturas, eventos, notas, `email_logs` (corpo completo) e resultados DISC não têm retenção.
- **Exclusão:**
  - `deleteCandidate` e `deleteCompany` apagam as linhas, mas **não os PDFs** no bucket `resumes`.
  - Não há fluxo de solicitação do titular (acesso/correção/eliminação).
  - A página `/sucesso` do DISC fica acessível para sempre com o token.
- **Terceiros:**
  - Resend: nome, e-mail e data da entrevista do candidato.
  - Gemini/OpenAI: texto do currículo redigido, só quando liberado (hoje só `isTest`).
  - Supabase: tudo.
  - Os e-mails levam HTML do template com o nome do candidato sem escape.
- **Dados sensíveis de colaboradores:** raça/cor, CPF, dados bancários, salário e exame admissional em `users`. Sem criptografia de coluna. Acessíveis a HR e ADMIN.
- **Decisão automatizada:** a IA não decide (ver §3.4). **Existe regra automática de reprovação**: sair da triagem sem tag GREEN reprova sozinho. Ela é disparada por ação humana e registrada em `STAGE_CHANGED` com `actorId`, mas sem confirmação explícita.

---

## 7. Processamento em background e infraestrutura

- **Fila:** `lib/tasks/queue.ts`.
  - Tabela `background_tasks`, `FOR UPDATE SKIP LOCKED`, lote de 5, orçamento de 40 s por execução.
  - Máximo de 5 tentativas; backoff de 30 s até 60 min com jitter (`backoff.ts`); até 10 adiamentos por erro transitório (429).
  - Recuperação de tarefa travada após 10 min.
  - Limpeza: tarefas `done` somem após 30 d, `failed` após 90 d.
- **Handlers:** `resume.analyze`, `resume.purge_versions`, `email.send` (`lib/tasks/handlers/index.ts`).
- **Como roda em produção:**
  - **não há cron da Vercel** (`vercel.json` = `{"regions":["gru1"]}`);
  - o disparo depende de **pg_cron + pg_net** no Supabase: `supabase/cron/process_tasks.sql`, que precisa ser executado manualmente em cada projeto, com os segredos `tasks_cron_url`/`tasks_cron_secret` no Vault. Ele agenda `dispatch_background_tasks()` a cada minuto (só chama a rota se houver trabalho) e `enqueue-resume-purge` diariamente às 06:00 UTC;
  - existe ainda um disparo "best effort" em `triggerQueueNow` (só ao pedir análise de IA manualmente);
  - **[INCERTO]:** não dá para confirmar pelo código se esse SQL foi aplicado e se os segredos do Vault apontam para o domínio atual. O `CONTEXT.md` avisa que precisam ser atualizados na troca de domínio. Se não estiver configurado, **e-mails e análises ficam `pending` para sempre**, e a purga de retenção nunca roda.
  - Em dev: `npm run tasks:dev`.
- **Deploy:** Vercel (`regions: gru1`; o `CONTEXT.md` avisa que a região só está disponível no plano Pro e que o plano Hobby é "não comercial"). `maxDuration = 60` na rota da fila.
- **Observabilidade:** só `console.error/warn`. Não há Sentry/monitoramento/alertas. A única tela operacional é Configurações → Tarefas (falhas por empresa). Tarefas de sistema (`company_id` null, como a purga) não aparecem para ninguém. O SUPERADMIN não tem visão da fila.
- **Tratamento de erro:** actions retornam `{error}`. Várias usam `requireRole` dentro de `try/catch` (`lib/actions/*`, `adminCompanies.ts`, `partners.ts`), o que transforma o redirect de "sem permissão" em mensagem genérica de erro (não vaza dados, mas confunde). Não há `error.tsx`/`not-found.tsx` customizados [INCERTO: nenhum foi encontrado em `app/`].

---

## 8. Front-end, UX e design system

### 8.1 Tokens reais

- **`app/globals.css`** (1 621 linhas):
  - `:root` com `--green-900 #1d1d1f` (preto, apesar do nome), `--green-700 #34c759`, `--green-600 #26a349`, `--gray-50 #f5f5f7`, `--gray-400 #86868b` (`--text-muted`), `--ink #1d1d1f`, `--danger #ff3b30`;
  - botões: `--action-confirm #177f0f`, `--action-cancel #fe0401`; `--focus-ring #195ab4`; raios 10/18 px; fontes Inter (texto) e Playfair Display (logo), em `app/layout.tsx`.
- **`tailwind.config.ts`:** espelha os tokens e **sobrescreve parcialmente as escalas `green` e `gray` do Tailwind**. `green-900`/`green-800` viram preto/cinza-escuro e `gray-200` vira `rgba(0,0,0,.06)`, enquanto `green-50`, `green-200` etc. continuam no padrão do Tailwind. Consequência: em telas de Tailwind cru, classes como `text-green-800`/`hover:bg-green-800` (`app/avaliacao/[token]/sucesso/page.tsx`, `DiscForm.tsx`) renderizam **preto**, não verde.

### 8.2 Convivência de estilos

- `fin-*` + CSS vars: **80 arquivos** `.tsx` usam classes `fin-`.
- **Tailwind cru, sem `fin-`:**
  - `app/(dashboard)/recrutamento/testes/*` (5 arquivos);
  - `app/avaliacao/[token]/page.tsx` e `/sucesso/page.tsx`;
  - `app/components/disc/DiscForm.tsx`;
  - `app/components/assessments/*` (3);
  - `components/recrutamento/AssessmentLinkButton.tsx`;
  - `components/examples/AccordionSidebar.tsx`.
- **Híbrido:** `components/layout/Sidebar.tsx` (Tailwind + `fin-sidebar__*`), `app/(dashboard)/recrutamento/page.tsx`, `components/ui/StatCard.tsx`.
- **Terceiro estilo:** **540 ocorrências de `style={{…}}` inline** em `app/` e `components/`. É o padrão dominante nas páginas `fin-*`.
- **Telas do candidato:** das 3 telas públicas do candidato, 1 (vagas/candidatura) usa `fin-*` e 2 (DISC e sucesso) usam Tailwind cru, com visual diferente (sombras, `rounded-lg`, verde padrão).

### 8.3 Componentes compartilhados e duplicações

- **Primitivas:** `components/ui/*` (Button, Card, Field, EmptyState, ConfirmDialog, DeleteButton, EditLock, FileDropzone, ListToolbar, SearchInput, StatCard…).
- **Duplicações:**
  - `AssessmentForm` existe duas vezes com propósitos diferentes (`app/(dashboard)/recrutamento/testes/components/AssessmentForm.tsx` = editor; `app/components/assessments/AssessmentForm.tsx` = resposta pública, morto);
  - `ScoreBar` + `competenciaScores` + `discScores` duplicados entre `components/recrutamento/DiscSection.tsx` e `app/avaliacao/[token]/sucesso/page.tsx`;
  - `WORK_MODE_LABEL` duplicado nas duas páginas públicas de vaga;
  - `generateToken` duplicado com algoritmos diferentes;
  - a pasta `app/components/` (componentes dentro de `app/`) diverge da convenção `components/`.

### 8.4 Estados de loading / vazio / erro (telas principais)

| Tela | Loading | Vazio | Erro |
|---|---|---|---|
| Dashboard (grupo) | `loading.tsx` global | — | sem `error.tsx` |
| Vagas | global | `EmptyState` | — |
| Vaga/Kanban | global | [INCERTO] | mensagens das actions |
| Banco de talentos | global | [INCERTO] | — |
| Colaboradores / Desligamentos / Tarefas | global | `EmptyState` | — |
| Testes (legado) | — | card próprio | card vermelho |
| Avaliação pública | Suspense "Carregando…" | — | "Link Inválido" genérico (não diferencia expirado de respondido) |
| Candidatura pública | "Enviando..." | "Nenhuma vaga aberta" | caixa de erro |

### 8.5 Acessibilidade (amostra)

- **Login/cadastro:** inputs dentro de `<label>` ✔; `autoComplete` ✔.
- **`ApplyForm`:** `FieldLabel` + `required` ✔; o dropzone é um `<label>` ✔.
- **`DiscForm`:**
  - os 60 grupos de rádio **não têm `fieldset`/`legend`** nem associação com o texto da afirmação (o leitor de tela anuncia "1, rádio");
  - o botão "Enviar Avaliação" usa `bg-green-700` = `#34C759` com texto branco (contraste ≈ 2,2:1, **reprova WCAG AA**);
  - a legenda da escala usa `text-[11px] text-gray-400`.
- **Contraste global:** `--text-muted #86868b` sobre branco ≈ 3,6:1, **abaixo de AA** para texto pequeno, e é usado em muitas descrições de 12–13 px.
- **Foco:** várias regras `outline: none` em `globals.css` (linhas 853, 1059, 1140, 1392, 1486, 1516, 1521). Algumas têm substituto `:focus-visible` (`.fin-upgrade`, `.fin-plan-card__cta`, `.fin-attention-card`) e em outras (`.fin-input:focus`, `.fin-search__input:focus`) [INCERTO se há box-shadow equivalente].
- **Uso de `aria-*`:** em 32 arquivos. A Sidebar tem `aria-expanded` e `title` quando recolhida.
- **Emojis como ícones:** 📋 e ⭐ em `testes/page.tsx`, sem texto alternativo.

### 8.6 Idioma / microcopy

- O app está todo em pt-BR (`<html lang="pt-BR">`). Exceções:
  - `lib/email.ts` retorna `'Resend API key not configured'` (inglês) e isso aparece em `email_logs.error_message` e na tela de tarefas;
  - mensagens do Supabase Auth repassadas cruas (`authError.message`) em `createColaborador`, `inviteUser`, `createCompanyWithAdmin` e `updateColaborador`.
- **Microcopy desatualizada:** landing e login falam de ponto/folha. A landing tem o botão "Ver dashboard (placeholder)". O rodapé da landing diz "Desenvolvido por Gabriel Malheiro" com link para o GitHub pessoal.
- **Inconsistência de termos:** "Candidatos" vs "Banco de Talentos" (rotas antigas redirecionam). "Testes" (legado) vs "DISC".

---

## 9. Qualidade de código e dívida técnica

### 9.1 Verificações executadas

- **`npx tsc --noEmit`:** **0 erros** (exit 0). O `tsconfig` tem `incremental: true`, então o comando reescreve `tsconfig.tsbuildinfo` (arquivo **versionado**). O arquivo foi restaurado com `git checkout` para manter a auditoria somente leitura. Recomendação: tirar `tsconfig.tsbuildinfo` do git.
- **`npm run lint`:** **não configurado**. Não há `.eslintrc`; `next lint` abre o assistente interativo ("How would you like to configure ESLint?"). O comando foi interrompido sem escolher nada, e nenhum arquivo foi criado.
- **`npm test`** (`vitest --project unit`): **6 arquivos, 99 testes, todos passam** (0,7 s).
  - Cobertura aproximada: só `lib/ai` (config/providers/redação/prompt/extração), `lib/resumes/files.ts` e `lib/tasks`.
  - **Zero testes** de Server Actions, autorização, isolamento de tenant, DISC (`calculate.ts`), Kanban/regras de etapa e rotas públicas.
  - `npm run test:db` (3 arquivos, ~35 casos) não foi executado (grava no banco de teste).
  - `app/actions/submitAssessment.test.ts` e `.test.db.ts` **não são incluídos** por nenhum project do vitest (`include` só cobre `tests/unit` e `tests/db`), então são testes mortos de código morto.

### 9.2 Código morto / órfão (confirmado por grep de imports)

- `components/recrutamento/AssessmentLinkButton.tsx` (nenhum import) → `lib/actions/generateAssessmentLink.ts` (só usado por ele).
- `lib/actions/updateJobAssessment.ts` (nenhum chamador). `JobAssessmentSelect` não existe mais no código.
- `app/components/assessments/AssessmentForm.tsx`, `AssessmentResultsDrawer.tsx`, `AssessmentScoreBadge.tsx` (só se referenciam entre si) → `app/actions/submitAssessment.ts` e `lib/assessments/client.ts`.
- `app/(dashboard)/recrutamento/testes/**`: funcional, mas legado e fora do menu.
- `app/exemplo-sidebar/page.tsx` + `components/examples/AccordionSidebar.tsx`: rascunho, **rota pública sem login**.
- `services/attention.ts` + `components/inicio/AttentionCard.tsx`: sem uso na tela, mantidos "para uso futuro" (comentário em `dashboard/page.tsx`).
- `lib/types/assessments.ts` (tipos do legado).
- Models sem uso: `TrainingTrail/Item/Assignment/Progress`, `EmployeeDocument`. `Consent` é só lido. `Company.aiScreeningEnabled` é só lido.
- Coluna legada `candidates.resume_path`.

### 9.3 Scripts quebrados / obsoletos

- `scripts/seed-demo-data.js`: **continua quebrado**. Usa `prisma.candidate.findFirst({ where: { …, jobId } })` e `create({ data: { jobId, … } })` (a coluna não existe desde a 0018) e `prisma.budget`/`prisma.budgetExpense` (tabelas removidas na 0014).
- `scripts/backfill-budget-categories.js`: obsoleto. A categoria `CATEGORIA_BUDGET` foi removida na migration 0015 e o CHECK de `company_options.category` não aceita esse valor.

### 9.4 TODOs, mocks, dados fictícios

- **TODO explícito:** `deleteColaborador` ("falta permissão mais granular").
- **PLACEHOLDER declarado:** `lib/plans.ts` (nomes/preços/limites), landing `app/page.tsx`, retenção de 12 meses.
- **Mock:** o provedor `mock` de IA (`lib/ai/providers/mock.ts`) é o **padrão** quando `AI_PROVIDER` está vazio. O card mostra "Exemplo simulado · sem IA" (segundo o `CONTEXT.md`; o texto exato na UI é [INCERTO]).
- **Depoimentos fictícios:** removidos (commit `47d8733`). `lib/testimonials.ts` não existe mais, mas o `CONTEXT.md` ainda o menciona.
- **Valor default visível:** `Sidebar` tem `userName = "Gabriel Malheiro"` como padrão (só aparece se a prop não vier).
- `supabase/backups/*.csv`: dados de demo de budget versionados.

---

## Divergências entre documentação e código

| Documento | Afirma | Código real |
|---|---|---|
| `prisma/schema.prisma` linha 1 | "Espelha supabase/schema.sql" | `schema.sql` não tem as tabelas de 0027–0032 nem as mudanças de 0033/0034 |
| `CONTEXT.md` ("schema.sql … precisa ser mantido em sincronia") | sincronia | desatualizado desde a 0027 (ver §4.2) |
| `ARCHITECTURE.md` §rotas, §permissões, fases 7–9 | `/ponto`, `/folha/*`, `/meu-ponto`, exportações CSV/XLSX | removidos (migration 0014); não existem rotas |
| `ARCHITECTURE.md` §9 | "Rate limiting na candidatura pública (por IP…)" | não existe |
| `ARCHITECTURE.md` §9 | "Upload: valida tipo real do arquivo (assinatura %PDF)… sanitiza nome, uuid" | a assinatura %PDF é conferida (`lib/resumes/versioning.ts:56`), mas o nome interno é o sha256 (não uuid). O rate limit citado no mesmo trecho não existe |
| `ARCHITECTURE.md` "RLS habilitado, negado por padrão" / "reforçado por RLS" | todas as tabelas | 7 tabelas sem RLS/revoke; nenhuma policy real |
| `ARCHITECTURE.md` "sidebar de 240px com grupos Menu/Outros", fase 3 "admin e colaborador veem menus diferentes" | | 280/76 px; a Sidebar não varia por role (só o bloco SUPERADMIN) |
| `CONTEXT.md` "ATS Fase 1 (e-mail — templates, Resend…): planejada, não iniciada" | não iniciada | `email_templates`, `email_logs`, handler `email.send` e e-mails de entrevista já existem (sem criação de templates) |
| `CONTEXT.md` rotas | lista sem `/admin/*`, `/recrutamento/disc*`, `/recrutamento/testes*`, `/avaliacao/*`, `/api/avaliacao`, `/api/analysis` | existem |
| `CONTEXT.md` "/dashboard … ADMIN/HR também veem a faixa de depoimentos" e "Remover depoimentos FICTÍCIOS (`lib/testimonials.ts`)" | depoimentos | removidos no commit `47d8733`; o arquivo não existe |
| `CONTEXT.md` "/pessoas, /desenvolvimento, /gestao reservadas pro Sidebar (group.href)" | grupos no menu | a Sidebar só tem o grupo Recrutamento; Colaboradores/Desligamentos/KPIs/Trilhas não estão no menu |
| Migration 0026 (comentário) | "Quando candidato é movido para stage TEST, o link de avaliação é gerado automaticamente" | não implementado |
| `prisma/schema.prisma` (DiscQuestion) "sem CRUD" | fixas | existe edição de texto em `/recrutamento/disc/perguntas` |
| Comentário de `app/actions/adminCompanies.ts` / pedido do usuário "cria Company+User ADMIN atomicamente com rollback" | atômico | sem transação: se `user.create` falhar, a empresa fica órfã (o rollback só vale para o usuário do Auth), tanto em `signup` quanto em `createCompanyWithAdmin` |
| Comentário de `lib/supabase/client.ts` "Nenhuma tabela de negócio é consultada por aqui" | | `lib/assessments/client.ts` consulta `assessment_responses` pelo client do browser (código morto) |
| Comentário de `app/(dashboard)/recrutamento/vagas/actions.ts` (`deleteJob`) | "candidates.job_id … on delete cascade" | a coluna agora é `applications.job_id` |
| Comentário de `deleteColaborador` | "tabelas de ponto/treinamento/folha" | não existem mais tabelas de ponto/folha |
| `.env.example` | lista de variáveis | faltam `RESEND_API_KEY` e `RESEND_FROM_EMAIL` |

---

## Riscos encontrados

| # | Severidade | Arquivo(s) | Descrição | Impacto | Sugestão (não implementada) |
|---|---|---|---|---|---|
| R1 | **Crítico** [INCERTO: depende do banco real] | `supabase/migrations/0003, 0007, 0010, 0013, 0017, 0018, 0019`; `supabase/schema.sql` | `applications`, `application_events`, `notifications`, `employee_exits`, `company_options`, `kanban_stage_labels`, `employee_documents` foram criadas depois do `revoke all` inicial, sem `enable row level security` nem `revoke`. O Supabase dá grant padrão a anon/authenticated | Qualquer pessoa com a anon key (pública no bundle JS) pode ler, alterar e apagar candidaturas, notas de candidatos, motivos de desligamento etc. de **todas as empresas** via REST | Rodar no SQL Editor: `select table_name, grantee, privilege_type from information_schema.role_table_grants where table_schema='public' and grantee in ('anon','authenticated');` e `select relname, relrowsecurity from pg_class where relnamespace='public'::regnamespace and relkind='r';`. Se confirmado, criar uma migration com `enable row level security` + `revoke all … from anon, authenticated` para as 7 tabelas; considerar `alter default privileges` |
| R2 | **Alto** | `app/(dashboard)/colaboradores/actions.ts` (`createColaborador`, `updateColaborador`, `deleteColaborador`), `schemas/colaborador.ts` | HR pode criar usuário ADMIN, mudar a própria role para ADMIN, rebaixar ou apagar ADMIN e trocar o e-mail de login de um ADMIN no Auth | Escalada de privilégio e tomada de conta dentro da empresa | Restringir alteração de role/e-mail e ações sobre ADMIN a ADMIN; impedir auto-alteração de role |
| R3 | **Alto** | `lib/actions/assessments.ts` (`updateAssessment`, `deleteAssessment`) | Não filtram `companyId` (IDOR) | Usuário de uma empresa altera ou apaga testes de outra | Adicionar `companyId: session.companyId` em todas as queries, ou remover o módulo legado |
| R4 | **Alto** | `app/empresa/[slug]/vagas/[jobId]/actions.ts`, `components/recrutamento/ApplyForm.tsx` | Candidatura pública sem consentimento/aviso de privacidade (LGPD art. 7º/9º); nenhum `Consent` é gravado | Tratamento de dados sem transparência/base registrada; a triagem por IA nunca roda para candidatos reais | Aviso de privacidade + checkboxes (tratamento obrigatório, IA opcional) gravando `consents` com versão/hash |
| R5 | **Alto** | `app/api/public/signup/route.ts`, `app/empresa/.../actions.ts` | Sem rate limit/captcha em cadastro de empresa e candidatura; cadastro sem verificação de e-mail | Spam de candidaturas/notificações, criação em massa de tenants, uso do e-mail de terceiros, custo de Storage/IA | Rate limit por IP (edge/middleware ou Upstash), captcha (Turnstile), honeypot, confirmação de e-mail |
| R6 | **Alto** | `app/actions/scheduleInterview.ts`; nenhum seed de `email_templates` | Os e-mails de entrevista dependem de templates que nenhum código cria; sem template nada é enviado e a UI não avisa | Candidato não recebe convite/link; recrutador acha que enviou | Criar templates padrão por empresa (no cadastro/seed) e avisar na UI quando não houver envio |
| R7 | **Alto** | `scripts/seedDisc.ts`, `lib/actions/generateDiscLink.ts`, `app/api/public/signup/route.ts`, `app/actions/adminCompanies.ts` | O DiscAssessment só é criado por script manual | Empresas novas não conseguem usar o DISC (funcionalidade central quebrada para clientes novos) | Criar o DISC padrão junto com a empresa (signup/admin) ou sob demanda |
| R8 | **Alto** [INCERTO] | `supabase/cron/process_tasks.sql`, `vercel.json` | A fila só roda em produção se o pg_cron/Vault foi configurado à mão e está com a URL atual | E-mails, IA e retenção parados sem alerta | Verificar `select * from cron.job;` e os segredos do Vault; adicionar monitoramento de tarefas `pending` antigas |
| R9 | **Alto** | `app/recuperar-senha/page.tsx` (sem callback) | Recuperação de senha sem `redirectTo` e sem página que troque a senha a partir do link | Usuário que esqueceu a senha não consegue recuperar pelo app | Rota de callback (`exchangeCodeForSession`) + tela "nova senha" |
| R10 | **Alto** [INCERTO se já foi feito] | `CONTEXT.md` (Pendências) | O documento registra que a service role key, a senha do banco e a senha do admin foram expostas fora do ambiente local e precisam ser trocadas | Acesso total ao banco/Storage de todas as empresas | Rotacionar as três credenciais e atualizar Vercel e `.env.local` |
| R11 | Médio | `lib/email.ts` (`renderTemplate`) | Variáveis (nome do candidato vindo do formulário público) entram sem escape no HTML do e-mail | Injeção de HTML/links em e-mail enviado com o domínio da empresa (phishing) | Escapar HTML das variáveis |
| R12 | Médio | `app/actions/scheduleInterview.ts` | Sem checagem de role (EMPLOYEE agenda/cancela); reagendar não volta `status` para SCHEDULED; cancelamento não avisa o candidato; eventos sem `actorId` | Autorização frouxa, estado incorreto, candidato sem aviso, auditoria incompleta | `requireRole(["ADMIN","HR"])`, setar `status: 'SCHEDULED'` no update, e-mail de cancelamento, gravar actor |
| R13 | Médio | `deleteCandidate`, `deleteCompany` | PDFs de currículo ficam no Storage após a exclusão | Retenção indevida de dados pessoais (LGPD) | Remover os arquivos do bucket junto com a exclusão |
| R14 | Médio | `app/(dashboard)/recrutamento/banco-de-talentos/actions.ts` (`resolveTargetStage`), `KanbanBoard.tsx` | Arrastar para fora da Triagem sem tag GREEN reprova automaticamente, sem confirmação | Reprovações acidentais de candidatos | Diálogo de confirmação ou bloquear o movimento com explicação |
| R15 | Médio | `app/empresa/.../actions.ts` + `lib/resumes/storeResumeVersion.ts` | Qualquer pessoa que saiba o e-mail de um candidato troca o "currículo atual" dele na empresa | Integridade do banco de talentos | Não promover automaticamente a versão atual vinda de formulário público para uma pessoa já existente, ou exigir confirmação |
| R16 | Médio | `lib/actions/generateDiscLink.ts`, `DiscSection.tsx` | Link DISC expirado nunca é regenerado | Recrutador fica sem saída | Gerar um token novo quando `expiresAt < now` e não houver resposta |
| R17 | Médio | `app/avaliacao/[token]/sucesso/page.tsx` | Mostra os scores completos ao candidato e a qualquer pessoa com a URL, para sempre | Exposição de avaliação comportamental; pode induzir expectativa | Decisão de produto; no mínimo checar expiração |
| R18 | Médio | `app/(dashboard)/recrutamento/banco-de-talentos/aiActions.ts` (`triggerQueueNow`) | Envia `CRON_SECRET` para um host derivado de headers da requisição | Possível vazamento do segredo [INCERTO na Vercel] | Usar uma URL fixa por env em vez de headers |
| R19 | Médio | `next.config.mjs`, `vercel.json` | Sem headers de segurança/CSP/frame-ancestors | Clickjacking, sem mitigação de XSS | Adicionar `headers()` com CSP, `X-Frame-Options`, `Referrer-Policy` |
| R20 | Médio | `app/api/public/signup/route.ts`, `app/actions/adminCompanies.ts` | Company e User criados sem transação | Empresas órfãs (slug ocupado) | `prisma.$transaction` para company+user |
| R21 | Médio | `lib/plans.ts` / ausência de enforcement | Limites de plano (usuários, IA/mês, DISC, e-mail) não aplicados | Receita/planos sem efeito | Aplicar os limites no servidor quando houver cobrança |
| R22 | Médio | `supabase/schema.sql` | Dump desatualizado (0027–0034) | Recriar o ambiente pelo `schema.sql` gera banco divergente e sem SUPERADMIN | Regenerar o `schema.sql` (ou `pg_dump --schema-only`) |
| R23 | Baixo | `email_logs`, `interviews`, `disc_questions` | Sem `company_id` | Risco em queries futuras / impossível ter RLS simples | Adicionar `company_id` |
| R24 | Baixo | `lib/actions/generateAssessmentLink.ts` | Token com `Math.random` | Previsível (código órfão) | Remover o legado ou usar crypto |
| R25 | Baixo | `app/exemplo-sidebar/page.tsx` | Rota pública de rascunho em produção | Superfície desnecessária/confusão | Remover |
| R26 | Baixo | `app/actions/uploadPartnerImage.ts` | SVG em bucket público; `linkUrl` sem validação de esquema | XSS por SVG no domínio do Storage; `javascript:` em link (só SUPERADMIN) | Proibir SVG e validar `https://` |
| R27 | Baixo | `scripts/seed-demo-data.js`, `scripts/backfill-budget-categories.js` | Scripts quebrados/obsoletos | Confusão, erro ao rodar | Remover ou atualizar |
| R28 | Baixo | lint ausente; `tsconfig.tsbuildinfo` versionado | Sem análise estática; diff ruidoso | Qualidade | Configurar ESLint; tirar `tsbuildinfo` do git |
| R29 | Baixo | `DiscForm.tsx`, `--text-muted` | Contraste e semântica de formulário abaixo de WCAG AA | Acessibilidade | `fieldset`/`legend`, cores com contraste ≥ 4,5:1 |

---

## Perguntas em aberto (para a dona do produto)

1. O candidato deve ver o próprio resultado do DISC no final (hoje vê todos os números e o perfil)? Ou só uma mensagem de "recebido"?
2. Por quanto tempo vocês querem guardar currículos e dados de candidatos que não foram contratados? (O código tem 12 meses provisórios e só para versões antigas do currículo.) Já houve orientação jurídica sobre isso?
3. Qual texto de aviso de privacidade/consentimento deve aparecer no formulário de candidatura? A análise por IA deve ser opcional para o candidato?
4. Quando o recrutador arrasta um candidato para fora da Triagem sem a tag verde, ele é reprovado automaticamente. É isso que vocês querem, ou deveria aparecer uma confirmação ou um bloqueio?
5. Um usuário do RH (HR) pode cadastrar, editar e excluir administradores? Quem pode excluir colaboradores?
6. Os e-mails de convite e link de entrevista devem ter um texto padrão para todas as empresas? Quem escreve esse texto? A empresa poderá personalizar?
7. O candidato deve receber e-mail quando a entrevista é cancelada, quando é reprovado, ou quando recebe o link do DISC?
8. O "Teste" antigo (múltipla escolha, em Recrutamento → Testes) ainda faz parte do produto ou pode ser removido de vez em favor do DISC?
9. As telas de Colaboradores, Desligamentos, KPIs e Trilhas continuam no produto? Hoje funcionam (menos Trilhas) mas não aparecem no menu.
10. Os limites dos planos (número de usuários, análises de IA por mês, DISC e e-mail só no Profissional) devem começar a valer agora ou só quando houver cobrança? Os preços da página de planos são definitivos?
11. Quem é o remetente dos e-mails aos candidatos (nome/endereço)? O domínio `inspect-talent.com` já é de vocês e está verificado no provedor de e-mail?
12. Os planos pagos da Vercel e do Supabase (backup automático, uso comercial) já foram contratados? As senhas/chaves citadas como expostas já foram trocadas?
13. Empresas criadas pelo cadastro público devem entrar direto, ou precisam de aprovação ou confirmação de e-mail antes?
14. Um candidato pode se candidatar mais de uma vez à mesma vaga? Deve haver um bloqueio?

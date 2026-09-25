# Inspect Talent — Arquitetura

> Referência visual: Inspect Talent reaproveita o design system do Inspect Finance
> (ver `finance-mockup.html` fornecido). Fundo claro, superfícies brancas, azul
> como cor de ação, cantos arredondados, sombras leves, sidebar de 240px.

## 1. Decisão de hospedagem (100% online, sem infra local)

Confirmado com o usuário: **tudo hospedado, nada local**.

- **Banco + Auth + Storage:** Supabase (plano Free) — projeto único na nuvem.
  Nenhum Postgres local, nenhum Docker.
- **App Next.js:** Vercel (plano Free/Hobby).
- **Prisma:** roda apenas como cliente TypeScript no build/servidor; conecta
  direto na connection string do Supabase. Não precisa de Postgres instalado
  na máquina do dev — `prisma migrate` aplica migrations remotamente.
- Custo total no MVP: **R$ 0** (dentro dos limites free do Supabase — 500MB
  de banco, 1GB de storage, 50k MAUs de Auth — e do Vercel Hobby).

## 2. Arquitetura geral

```
Usuário (browser)
   │
   ├── páginas públicas (landing, /empresa/{slug}/vagas) ─┐
   ├── login (Supabase Auth via @supabase/ssr)            │
   └── dashboard (Server Components + Server Actions)     │
                     │                                     │
                     ▼                                     ▼
          Next.js (Vercel, servidor)             Route Handler público
                     │                            /api/public/jobs/[id]/apply
     resolve sessão → {userId, companyId, role}            │
                     │                                     │
                     ▼                                     ▼
        Service layer (services/*.ts)  ───────────────────┘
        sempre filtra por companyId da sessão, nunca do payload
                     │
                     ▼
        Prisma Client (service_role / DB user com privilégio total)
                     │
                     ▼
        Supabase Postgres (RLS habilitado, negado por padrão para
        anon/authenticated — rede de segurança, não a defesa principal)
                     │
                     ▼
        Supabase Storage (bucket privado `resumes`, signed URLs)
```

**Regra de ouro:** o browser nunca fala com o Postgres diretamente. Toda
leitura/escrita de dados de negócio passa por Server Action ou Route Handler.
O único uso client-side do Supabase é o SDK de Auth (login/logout/sessão).

## 3. Modelo de dados (ER resumido)

```
companies 1───* users
companies 1───* jobs 1───* candidates
companies 1───* training_trails 1───* training_items
users     1───* training_assignments *───1 training_trails
training_assignments 1───* training_progress *───1 training_items
companies 1───* time_clocks *───1 users
companies 1───* payroll_variables *───1 users
```

Todas as tabelas de negócio têm `company_id` (denormalizado mesmo quando
derivável via join, para simplificar filtros e RLS). `company_id` de
`candidates` e `training_items` é preenchido por trigger a partir do
registro pai (`jobs`/`training_trails`) — nunca aceito do cliente.

Script completo, com PK/FK/índices/checks: [supabase/schema.sql](supabase/schema.sql).

Decisões de modelagem:
- **Sem soft-delete geral.** Onde a UI pede "ativar/desativar" (usuários,
  vagas via `status`, trilhas), usamos coluna `active`/`status`. Onde a UI
  pede "excluir" (candidato), é hard delete — dado de MVP, sem requisito de
  retenção declarado.
- **`time_clocks.recorded_at`** sempre `now()` do Postgres, nunca aceito do
  cliente. Sequência ENTRADA/SAÍDA e proteção contra corrida/duplo clique são
  garantidas pela função `register_time_clock()` (SECURITY DEFINER, usa
  `pg_advisory_xact_lock` por usuário).
- **`payroll_variables.competence`** é sempre o primeiro dia do mês
  (constraint `= date_trunc('month', competence)`), evitando ambiguidade de
  "qual competência" em relatórios.

## 4. Rotas (frontend)

```
Públicas
  /                                landing page
  /login
  /empresa/[slug]/vagas            lista de vagas abertas
  /empresa/[slug]/vagas/[jobId]    detalhe + formulário de candidatura

Admin/HR (grupo (dashboard), guardado por sessão + role ADMIN|HR)
  /dashboard
  /colaboradores
  /recrutamento/vagas
  /recrutamento/candidatos         kanban
  /desenvolvimento/trilhas
  /desenvolvimento/progresso
  /ponto
  /folha/variaveis
  /folha/relatorios
  /configuracoes

Colaborador (grupo (employee), guardado por sessão, qualquer role)
  /meu-ponto
  /meu-espelho
  /meu-desenvolvimento
  /meu-perfil
```

## 5. API / Server Actions

Toda mutação é uma Server Action; a única Route Handler HTTP "de verdade" é a
candidatura pública (precisa de `multipart/form-data` para o PDF) e o export
de arquivos (precisa retornar um stream binário).

```
services/jobs.ts            createJob, updateJob, publishJob, listJobsByCompany
services/candidates.ts      applyToJob (route handler, service_role),
                             moveCandidateStage, addNote, deleteCandidate
services/training.ts        createTrail, addItem, assignTrail,
                             completeItem (upsert idempotente), getProgress
services/timeclock.ts       clockIn (chama register_time_clock via Prisma
                             $queryRaw), listByUserAndPeriod
services/payroll.ts         createVariable, listByCompetence
services/export.ts          exportTimeClocksCsv, exportTimeClocksXlsx,
                             exportPayrollXlsx, exportPayrollPdf

app/api/public/jobs/[jobId]/apply/route.ts   POST multipart (nome, email,
  telefone, linkedin, resume) — valida PDF (assinatura de bytes, não só
  extensão), limite 5MB, rate-limit por IP, deriva company_id do job.
```

Toda Server Action começa com:
```ts
const session = await requireSession(); // lança se não autenticado
// session = { userId, companyId, role } — resolvido no servidor
```
Nunca há um parâmetro `companyId` vindo do formulário/cliente em nenhuma
dessas funções.

## 6. RBAC + isolamento multi-tenant

| Ação | ADMIN | HR | EMPLOYEE |
|---|---|---|---|
| Gerenciar vagas/candidatos | ✔ | ✔ | ✘ |
| Gerenciar trilhas | ✔ | ✔ | ✘ |
| Ver progresso de todos | ✔ | ✔ | ✘ |
| Ver/marcar próprios treinamentos | ✔ | ✔ | ✔ |
| Bater o próprio ponto | ✔ | ✔ | ✔ |
| Ver ponto de terceiros / exportar | ✔ | ✔ | ✘ |
| Lançar variáveis de folha | ✔ | ✔ | ✘ |
| Gerenciar colaboradores | ✔ | ✔ | ✘ |

Implementação: um helper `requireRole(session, ['ADMIN','HR'])` no topo de
cada service que precisa restringir; para dados "próprios" (ponto,
treinamento do colaborador), o filtro é sempre `WHERE user_id = session.userId
AND company_id = session.companyId`, nunca um id vindo do cliente.

Isolamento multi-tenant: **todo** `findMany`/`findUnique` do Prisma nos
services de negócio inclui `company_id: session.companyId` explicitamente.
Isso é reforçado por um teste de lint simples (fase de segurança) que varre
`services/*.ts` procurando queries Prisma sem `company_id` no `where`.

## 7. Componentes (design system portado do Inspect Finance)

Tokens de cor/espaçamento/raio extraídos do `finance-mockup.html` viram
`tailwind.config.ts` + CSS vars em `app/globals.css`. Primitivas em
`components/ui/`: Button, Card, Badge, Input, Select, Modal, Dialog, Table,
Tabs, Progress, Dropdown, Sidebar, Header, Search, EmptyState, LoadingState,
ConfirmDialog. Layout `components/layout/Sidebar.tsx` e `Header.tsx`
reproduzem a sidebar de 240px com grupos "Menu"/"Outros" e o header com
breadcrumb + título + tooltip, adaptando o menu para os módulos de RH.

## 8. Fluxos principais

- **Candidatura:** visitante preenche form → upload vai para
  `/api/public/jobs/[jobId]/apply` → valida PDF (magic bytes + extensão +
  tamanho) → sobe para Storage em `company/{companyId}/candidates/{candidateId}/resume.pdf`
  com nome gerado (uuid), nunca o nome original → insere `candidates` com
  `company_id` derivado do job (trigger) → RH vê no Kanban em `TRIAGE`.
- **Movimentação de candidato:** drag-and-drop (`@dnd-kit/core`) dispara
  Server Action `moveCandidateStage(candidateId, newStage)` que valida que o
  candidato pertence à `session.companyId` antes de atualizar.
- **Treinamento:** RH cria trilha + itens ordenados (`position`); atribui a
  colaboradores (`training_assignments`, unique por par usuário/trilha).
  Colaborador marca item concluído → upsert em `training_progress` com
  constraint `unique(assignment_id, training_item_id)` (idempotente, sem
  duplicidade); progresso = `completed / total`.
- **Ponto:** colaborador clica "Bater Ponto" → frontend tenta geolocalização
  (best effort, segue sem ela se negada) → Server Action chama
  `register_time_clock(userId, companyId, lat, lng)` → função no Postgres
  serializa com advisory lock, decide ENTRADA/SAÍDA pelo último registro do
  dia, grava com `now()` do servidor.
- **Variável de folha:** RH seleciona competência (mês) + colaborador + tipo
  + valor → Server Action valida `amount >= 0`, `competence` truncado ao mês,
  colaborador pertence à empresa.
- **Exportação:** Server Action gera CSV/XLSX/PDF em memória a partir de uma
  query já filtrada por `companyId`, retorna como download — nunca expõe uma
  rota genérica de "exportar por id" sem revalidar o tenant.

## 9. Segurança

- Autenticação via Supabase Auth; sessão lida no servidor com
  `@supabase/ssr`, nunca confiar em estado guardado no cliente.
- Autorização: RBAC checado em cada Server Action, nunca só escondendo botão
  na UI.
- Isolamento de tenant: sempre resolvido da sessão, nunca do payload;
  reforçado por RLS "deny by default" no Postgres como rede de segurança.
- Upload: valida tipo real do arquivo (assinatura de bytes `%PDF`), tamanho
  máximo, sanitiza nome, gera nome interno (uuid), bucket privado, signed URL
  com expiração curta para o RH visualizar.
- Rate limiting na candidatura pública (por IP, ex. 5 candidaturas/hora) e
  honeypot simples no formulário para reduzir spam.
- Nenhuma chave `service_role` chega ao browser — vive só em env vars do
  servidor (Vercel).

## 10. Estrutura do projeto

```
app/
  (public)/
  (auth)/
  (dashboard)/
  (employee)/
  api/public/jobs/[jobId]/apply/route.ts
components/
  ui/
  layout/
lib/
  supabase/        clients (server, browser só para auth)
  session.ts        requireSession/requireRole
prisma/
  schema.prisma
services/
supabase/
  schema.sql
types/
schemas/            validação zod por módulo
```

## 11. Plano de implementação por fases

| Fase | Objetivo | Critério de aceite |
|---|---|---|
| 1. Setup | Next.js + Tailwind + design tokens do Inspect Finance + UI primitivas | `npm run dev` mostra sidebar/header/dashboard placeholder com a mesma linguagem visual |
| 2. Auth + Multi-tenant | Projeto Supabase free, login, `users`/`companies`, `requireSession` | login funcional, sessão resolve companyId/role |
| 3. Layout definitivo | Sidebar com menus reais, guards de rota por role | admin e colaborador veem menus diferentes |
| 4. Colaboradores | CRUD + convite (magic link) | RH cria colaborador, ele recebe convite e loga |
| 5. R&S | Página pública de vagas, candidatura, Kanban | candidatura cria registro, drag-and-drop move estágio |
| 6. T&D | Trilhas, itens, atribuição, progresso | colaborador marca item, progresso bate no dashboard |
| 7. Ponto | Bater ponto, espelho, painel RH | sequência ENTRADA/SAÍDA correta mesmo com cliques duplos |
| 8. Folha Lite | Lançamento de variáveis, relatório | valores batem no relatório por competência |
| 9. Exportações | CSV/XLSX ponto, XLSX/PDF folha | arquivo baixado só contém dados do tenant logado |
| 10. Segurança | Revisão de RLS, rate limit, upload | checklist da seção 9 sem pendência |
| 11. Deploy | Vercel + Supabase free em produção | app acessível publicamente, env vars configuradas |

## 12. Fora de escopo do MVP

Tudo listado na seção 22 da spec original (folha completa, eSocial, INSS,
FGTS, IRRF, banco de horas, IA, integrações, biometria, app nativo). Não
implementado até V2/V3 (roadmap na spec original, seções 23).

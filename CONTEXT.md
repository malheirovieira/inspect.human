# Inspect Human — Contexto de desenvolvimento

> Este arquivo documenta o **estado real** do projeto (o que foi de fato
> construído) — diferente do `ARCHITECTURE.md`, que é o plano original
> pré-implementação e já está desatualizado em vários pontos. Use este
> arquivo pra retomar contexto rápido.

## Redução de escopo

O produto deixou de cobrir folha de pagamento, ponto e orçamento — foco
agora é **só recrutamento + desenvolvimento de colaboradores** (ficha
completa continua existindo, incluindo desligamentos/turnover). Detalhe
completo de tudo que saiu/entrou: `BACKEND_CONTEXT.md`, seção "Redução de
escopo".

**Sem integração com ERP** — decisão explícita, não é uma pendência. A aba
"ERP" que existia na ficha do candidato foi removida de propósito; não é
pra recriar no futuro.

## Stack (verificado em `package.json`)

- **Next.js 14** (App Router), React 18, TypeScript.
- **Prisma 7** com `@prisma/adapter-pg`, schema multi-schema (`public` +
  `auth`), migrations manuais em `supabase/migrations/*.sql` (não usa
  `prisma migrate`) — `supabase/schema.sql` é o documento de referência
  "do zero" e precisa ser mantido em sincronia com as migrations.
- **Supabase**: Postgres + Auth (`@supabase/ssr` no servidor,
  `@supabase/supabase-js` no cliente só pra login/logout). Storage: bucket
  privado `resumes` (currículo — upload público na candidatura ou manual
  pelo recrutador na aba Perfil), sempre por URL assinada de curta duração,
  nunca URL pública.
- **Tailwind CSS 3** + design system em classes `fin-*` (`app/globals.css`),
  com tokens espelhados em `tailwind.config.ts` — os dois precisam ser
  editados juntos quando a paleta muda.
- `@dnd-kit/*` (kanban de candidatos), `zod` (validação de schemas).
  `framer-motion` e `recharts` foram removidos (framer-motion virou CSS
  puro na transição de página; recharts só existia pro Budget, que saiu).

## Rotas implementadas

```
Públicas
  /                              landing
  /login, /cadastro, /recuperar-senha
  /empresa/[slug]/vagas          lista pública de vagas
  /empresa/[slug]/vagas/[jobId]  candidatura pública
  /api/public/signup             route handler
  /api/search                    busca global do header (colaboradores/vagas/candidatos)

Dashboard (grupo (dashboard), sessão obrigatória)
  /dashboard                                                  "Início" — pouso fixo pós-login, fora
                                                                de qualquer grupo do Sidebar, sem
                                                                checagem de role. Conteúdo mínimo de
                                                                propósito (saudação + atalhos).
  /pessoas, /desenvolvimento, /gestao                         reservadas pro Sidebar (group.href),
                                                                SEM página própria ainda — os módulos
                                                                continuam desabilitados no menu.
  /colaboradores, /colaboradores/novo, /colaboradores/[id]/editar
  /desligamentos
  /recrutamento                                               painel do módulo (dados reais) — aberto
                                                                ao clicar no NOME "Recrutamento" no menu
  /recrutamento/vagas, /recrutamento/vagas/[jobId]
  /recrutamento/vagas/[jobId]/candidaturas/[applicationId]    detalhe de UMA candidatura (ver seção
                                                                "Recrutamento — modelo de dados" abaixo)
  /recrutamento/banco-de-talentos                             lista de candidaturas (busca/filtro por
                                                                vaga/etapa/tag) — SEM Kanban aqui
  /recrutamento/banco-de-talentos/[candidateId]                perfil da PESSOA (não da candidatura)
  /recrutamento/candidatos, /recrutamento/candidatos/[candidateId]
                                                                redirects pra banco-de-talentos (rota
                                                                renomeada) — preservam query string
  /desenvolvimento/trilhas, /desenvolvimento/progresso
  /gestao/kpis
  /configuracoes
```

`app/exemplo-sidebar/` é um componente de exploração/rascunho, não faz parte
do fluxo real do produto.

## Sidebar (`components/layout/Sidebar.tsx`)

- Largura 280px expandida / 76px recolhida (`localStorage`, sobrevive a
  reload).
- "Início" (antigo "Dashboard") fica **fora de `GROUPS`**, sem rótulo de
  seção acima — é o pouso fixo pós-login (sempre lá, nunca "último módulo
  visitado"), por isso nenhuma seção do menu acende quando o usuário está
  nela.
- Cada grupo (`NavGroup`) tem um `href` (visão geral do módulo). Nome do
  grupo e a seta são o **mesmo elemento clicável** (um `<Link>` só,
  `onClick` também chama `toggleGroup`) — clicar em qualquer parte navega
  pra visão geral do módulo E expande/recolhe o acordeão junto. Não são duas
  zonas de clique separadas (foi tentado e revertido a pedido do usuário).
  `groupForPath` reconhece a rota exata do módulo (`pathname === g.href`)
  além dos sub-itens, pra saber qual grupo destacar.
- Estado ativo do grupo selecionado: fundo branco (não cinza), com um hover
  bem sutil (`hover:bg-gray-50`) só quando selecionado — sem fundo cinza
  algum no hover normal (nem no título, nem na seta), só troca de cor do
  ícone/texto.
- Grupos **Pessoas** (Colaboradores/Desligamentos), **Desenvolvimento** e
  **Gestão** estão `disabled: true` — cinza, sem interação, mesmo padrão do
  item "Ajuda". Só **Recrutamento** está ativo hoje.

## Recrutamento — modelo de dados (Candidate × Application × ApplicationEvent)

Base do ATS. `Candidate` e `Application` **são tabelas separadas** desde a
migration `0018` — qualquer trabalho futuro no módulo depende disso já
estar assim; confirme antes de assumir o contrário.

- **`Candidate`** — a PESSOA: nome, e-mail, telefone, LinkedIn, currículo
  (`resumePath`, bucket `resumes`). Reaproveitada entre candidaturas —
  `applyToJob`/`createCandidateManual` procuram por e-mail dentro da
  empresa antes de criar um novo (sem constraint de unicidade no banco,
  aceitável por ora). **Sem campo de notas** — anotação é evento (ver
  abaixo), não texto solto na pessoa.
- **`Application`** — a CANDIDATURA de um Candidate a UMA vaga: `stage`,
  `position` (ordem manual no Kanban), `qualificationTag`, `hiredAt`. Etapas
  em `schemas/candidate.ts` (`CANDIDATE_STAGES`): `TRIAGE, TEST, INTERVIEW,
  PROPOSAL, HIRED, REJECTED` — sem check constraint no banco (validado só
  no Zod, mais barato adicionar etapa nova). `PIPELINE_STAGES` é a mesma
  lista sem `REJECTED` (usada no funil do painel e no checklist da
  candidatura — `REJECTED` é uma saída, não uma etapa sequencial).
- **`ApplicationEvent`** — histórico cronológico de uma candidatura
  (`STAGE_CHANGED`, `TAG_CHANGED`, `NOTE_ADDED`, `APPLICATION_CREATED`, e no
  futuro `EMAIL_*`). `payload` é JSON livre por tipo, `actorId` null =
  evento gerado pelo sistema (candidatura pública, sem sessão). Lido por
  `services/applicationEvents.ts` (`listApplicationEvents`), renderizado
  pelo componente `CandidateTimeline`.

### Página da pessoa vs. página da candidatura

- **`/recrutamento/banco-de-talentos/[candidateId]`** — perfil da PESSOA,
  3 abas: **Perfil** (dados de contato + currículo — upload manual via
  `uploadCandidateResume`; espaço reservado sem placeholder visível pro
  resumo por IA, fase futura), **Candidaturas** (lista de todas as vagas em
  que ela participou, com etapa/resultado, linka pra cada candidatura) e
  **Documentos** (estado estático "Em desenvolvimento" — quando existir, só
  vai pedir documento pra candidatura na etapa Contratado, é admissão, não
  seleção — comentário anotado em `page.tsx`).
- **`/recrutamento/vagas/[jobId]/candidaturas/[applicationId]`** — detalhe
  da CANDIDATURA: cabeçalho editável (`ApplicationHeader` — etapa + tag),
  checklist do processo (`CandidateProcessChecklist`) e a timeline única
  (`CandidateTimeline` — anotação no topo + eventos abaixo, substituiu os
  antigos "Histórico do processo"/"Adicionar anotação"/"Histórico de
  atividade" separados).

### Sincronização Kanban × Checklist — UMA fonte de verdade

O checklist da candidatura **não tem armazenamento próprio** (o antigo
`Application.processSteps` JSON foi removido, migration `0020`). Ele é
100% derivado de `Application.stage` — a mesma coluna que o Kanban da vaga
usa. Clicar numa etapa do checklist chama `moveCandidateStage`, a MESMA
action que o drag-and-drop do Kanban usa (`moveCandidateInKanban`) — os
dois ficam sincronizados automaticamente, sem código duplicado. Toda
mudança de etapa (venha de onde vier) revalida `/recrutamento/banco-de-talentos`,
`/recrutamento/vagas/[jobId]` e `/recrutamento/vagas/[jobId]/candidaturas/[applicationId]`.

`REJECTED` não entra na sequência do checklist (que é só `PIPELINE_STAGES`)
— quando a candidatura é reprovada, o checklist mostra até onde ela chegou
(calculado a partir do último evento `STAGE_CHANGED` com `to: "REJECTED"`,
usando o `from` dele) e um aviso "Reprovado em [etapa]".

### Tag de triagem e reprovação automática

`CANDIDATE_TAGS` = `GREEN` ("Perfil compatível"), `BLUE` ("Banco de
talentos"), `RED` ("Perfil incompatível") — só existe/edita enquanto
`stage === "TRIAGE"`. Duas regras de negócio amarradas a ela, ambas em
`resolveTargetStage()` (`app/(dashboard)/recrutamento/banco-de-talentos/actions.ts`):

1. Marcar a tag como `RED` reprova a candidatura na hora (move pra
   `REJECTED` automaticamente, sem precisar de um segundo passo manual).
2. Só é possível sair de `TRIAGE` pra frente (Teste/Entrevista/Proposta/
   Contratado) se a tag for `GREEN` — tentando avançar sem isso (pelo
   Kanban OU pelo checklist, mesma regra pros dois) reprova automaticamente
   em vez de mover pra etapa pedida. Isso é decisão de produto, não bug: só
   segue quem foi explicitamente aprovado na triagem.

Quando `stage === "REJECTED"`, o seletor de etapa no cabeçalho da
candidatura fica desabilitado (cinza, bloqueado) — precisa dessa trava
porque a reprovação (manual ou automática) é tratada como final.

### Filtro "Mostrar reprovados"

A aba Candidatos de uma vaga esconde `REJECTED` por padrão (Kanban não
renderiza a coluna, lista não mostra as linhas) — botão "Mostrar
reprovados" (`?showRejected=1` na URL) revela os dois. `KanbanBoard` aceita
`visibleStages` pra isso.

### Telefone — regra em todo o sistema

Todo campo de telefone (candidatura pública, cadastro manual de candidato,
perfil da pessoa, colaborador) usa `lib/phoneMask.ts` (`formatPhone`): tela
mostra mascarado (`(11) 91234-5678`), banco guarda só dígitos
(`.replace(/\D/g, "")` antes de salvar). Padrão único, não é por tela.

## Design system — estado atual

Paleta em verde (`--green-700`/`--success` etc. em `app/globals.css`,
espelhada em `tailwind.config.ts`) — já mudou várias vezes nesta sessão,
checar visualmente antes de assumir que é a atual. Fonte base **Inter**
(`--apple-system, BlinkMacSystemFont` na frente do stack — SF Pro real em
Mac/iOS, Inter de fallback fora do ecossistema Apple, já que a fonte da
Apple não pode ser hospedada). Playfair Display só na wordmark do logo.

Cards do Kanban de candidatos são estilo Trello: fundo branco, cartão
inteiro arrastável (sem alça separada — `activationConstraint: {distance:
5}` no sensor evita que um clique vire drag sem querer), sombra leve com
elevação no hover.

## Armadilhas já descobertas (não repetir)

1. **Server Action recebendo função como prop/children, vindo de Server
   Component**: quebra em runtime. Componentes de toggle recebem só dados
   serializáveis, nunca uma função vinda de um Server Component.
2. **`navigator.clipboard.writeText()` exige contexto seguro** (HTTPS ou
   `localhost`) — `CopyLinkButton` tem fallback via `execCommand`.
3. **`npm run dev:lan` + acesso por IP**: precisa listar o IP em
   `allowedDevOrigins` no `next.config.mjs`, senão a página carrega mas não
   hidrata.
4. **Nunca rodar dois processos de dev ao mesmo tempo** — disputam porta e
   corrompem o cache `.next`. Sempre `taskkill` os antigos antes de subir
   um novo; erro tipo `File '.../page.ts' not found` no build quase sempre
   resolve só de rodar `rm -rf .next && npm run build` de novo.
5. **Comentário CSS nunca pode conter `*/` no meio do texto**.
6. Ordem de cascata em `app/globals.css`: utilitários do Tailwind entram no
   topo do arquivo, então classes customizadas declaradas mais abaixo
   vencem utilities de mesma especificidade.
7. Ao remover uma tabela/coluna, checar toda página que depende dela mesmo
   sem estar na lista óbvia — grep antes de apagar o service.
8. **Select nativo (`<select>`) ignora `border-radius` do container** — a
   seta do navegador fica colada na borda em selects "pílula". Resolvido
   com `appearance: none` + seta SVG customizada via `background-image`
   (ver `.fin-filter-select` e `select.fin-input` em `globals.css`).

## Pendências conhecidas

- Upload real de documento do colaborador (`EmployeeDocument.fileUrl`):
  falta bucket no Supabase Storage, action de upload e componente de UI.
- `/gestao/relatorios`: removida, reconstrução (ou não) fica pra depois.
- `/pessoas`, `/desenvolvimento`, `/gestao` (visão geral do módulo): rota
  reservada no Sidebar (`group.href`), sem página própria — os módulos
  continuam desabilitados no menu, então não há redirect quebrado por
  enquanto.
- ATS Fase 1 (comunicação por e-mail — templates, Resend, gatilho por
  etapa, seleção em lote, fila de tarefas `BackgroundTask` via cron
  externo): planejada, não iniciada. `ApplicationEvent` já suporta os tipos
  `EMAIL_QUEUED/SENT/FAILED` no componente de timeline, só falta a
  implementação em si.

## Rodando localmente / testando em rede

```
npm run dev          # só localhost:3000
npm run dev:lan       # 0.0.0.0:3000 — acessível por outras máquinas na rede
```
Pra acesso por IP da rede local funcionar de verdade, o IP precisa estar
listado em `allowedDevOrigins` no `next.config.mjs`.

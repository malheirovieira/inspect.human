# Inspect Talent — Contexto de desenvolvimento

> Este arquivo documenta o **estado real** do projeto (o que foi de fato
> construído) — diferente do `ARCHITECTURE.md`, que é o plano original
> pré-implementação e já está desatualizado em vários pontos. Use este
> arquivo pra retomar contexto rápido.

## Nome do sistema

**Inspect Talent** (desde 2026-09-25; antes "Inspect Human"). **Não usar o
nome antigo em nenhum texto novo** — interface, e-mails, textos de
consentimento, documentação. Mesma grafia do contexto: "Inspect Talent" no
texto corrido, "INSPECT TALENT" em rótulos em maiúsculas.

O nome antigo só continua, de propósito, em identificadores técnicos que
não foram trocados: pasta local `inspect.human`, repositório GitHub
`malheirovieira/inspect.human`, valor do `CRON_SECRET` local, domínio e
projeto na Vercel (ver "Pendências antes do primeiro cliente") e a chave
legada `inspect-human:sidebar-collapsed` — lida uma única vez pra migrar a
preferência do menu pra `inspect-talent:sidebar-collapsed`
(`components/layout/Sidebar.tsx`, `readCollapsedPreference`).

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
  `recharts` foi removido (só existia pro Budget, que saiu). `framer-motion`
  saiu da transição de página (virou CSS puro — com Server Components/
  streaming dava um "piscar") e VOLTOU em 2026-09-25 só pra faixa de
  depoimentos da Início (AnimatePresence + animação de layout, componente
  client). Não usar na transição de página.
- **Vitest 4** (testes — ver seção "Testes"). Fixado na 4 porque a 5 exige
  `@types/node` >= 22 e o projeto está no 20.
- Hospedagem: **Vercel Hobby** + **Supabase free** (ver "Pendências antes do
  primeiro cliente"). `vercel.json` define `"regions": ["gru1"]` (São Paulo)
  para minimizar latência até o Supabase em `sa-east-1`; disponível a partir
  do plano Pro — confirmar no painel antes do próximo deploy.
- **Performance (2026-09-26)**: `services/company.ts` exporta `getCompany()`
  cacheada com React `cache()` — layout, vaga e UpgradeButton compartilham
  1 query por requisição. `getProfileAiState` aceita dados prefetchados do
  `getPerson()` (elimina 1 query duplicada no perfil). `AutoRefresh` usa
  `GET /api/analysis/[id]/status` em vez de `router.refresh()` a cada tick.

## Rotas implementadas

```
Públicas
  /                              landing
  /login, /cadastro, /recuperar-senha
  /empresa/[slug]/vagas          lista pública de vagas
  /empresa/[slug]/vagas/[jobId]  candidatura pública
  /api/public/signup             route handler
  /api/search                    busca global do header (colaboradores/vagas/candidatos)
  /api/cron/tasks                processador da fila de tarefas — POST com Bearer CRON_SECRET
                                   (ver "Fila de tarefas em segundo plano")

Dashboard (grupo (dashboard), sessão obrigatória)
  /dashboard                                                  "Início" — pouso fixo pós-login, fora
                                                                de qualquer grupo do Sidebar, sem
                                                                checagem de role. Título + fundo
                                                                ambiente animado; ADMIN/HR também veem
                                                                a faixa de depoimentos.
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
  /configuracoes/usuarios, /configuracoes/tarefas             só ADMIN
  /configuracoes/planos                                       só ADMIN — cards de preço (lib/plans.ts)
```

`app/exemplo-sidebar/` é um componente de exploração/rascunho, não faz parte
do fluxo real do produto.

## Sidebar (`components/layout/Sidebar.tsx`)

- Largura 280px expandida / 76px recolhida (`localStorage`, sobrevive a
  reload).
- **Fundo branco opaco** (sem transparência/desfoque). O fundo animado da
  Início (`AmbientBackground`) fica só na área da página, à direita: é o
  primeiro filho do `.fin-main`, numa camada `sticky` do tamanho da tela, com
  posições em % da área (acompanha o menu aberto/recolhido).
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
  (versão atual em `currentResumeId` — ver "Currículo versionado" abaixo),
  `isTest` (candidato fictício, só ADMIN edita, selo "Teste"). Reaproveitada entre candidaturas —
  `applyToJob`/`createCandidateManual` procuram por e-mail dentro da
  empresa antes de criar um novo (sem constraint de unicidade no banco,
  aceitável por ora). **Sem campo de notas** — anotação é evento (ver
  abaixo), não texto solto na pessoa.
- **`Application`** — a CANDIDATURA de um Candidate a UMA vaga: `stage`,
  `position` (ordem manual no Kanban), `qualificationTag`, `hiredAt`. Etapas
  em `schemas/candidate.ts` (`CANDIDATE_STAGES`): `TRIAGE, INTERVIEW, TEST,
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

### Currículo versionado (migration `0022`)

- **`CandidateResume`** = uma VERSÃO do currículo. Caminho no bucket privado
  `resumes`: `empresa/pessoa/<sha256>.pdf` — **nunca `upsert`**. Arquivo
  diferente = versão nova; o mesmo arquivo reaproveita a versão (unique
  `candidateId + sha256`), o que também garante "um processamento de IA por
  versão" na Fase 3. Guarda o texto extraído do PDF (preenchido na Fase 3).
- **`Candidate.currentResumeId`** = versão ATUAL da pessoa (perfil, card de
  IA). **`Application.resumeId`** = versão ENVIADA com aquela candidatura —
  registro histórico, gravado uma vez e nunca atualizado (upload novo no
  perfil não mexe nas candidaturas). null = candidatura sem currículo ou
  anterior ao versionamento.
- Gravação SEMPRE por `storeResumeVersion` (`lib/resumes/`) — formulário
  público e upload do recrutador. Confere a assinatura `%PDF-` (não confia
  no Content-Type), calcula o hash no upload, sobe o arquivo e, numa
  transação, atualiza os ponteiros e marca `supersededAt` na versão
  substituída. Regras testadas em `tests/db/resumeVersions.test.ts`.
- Perfil da pessoa mostra a versão atual, "Versões anteriores" (recolhível)
  e "Enviar nova versão".
- **Transição**: `Candidate.resumePath` (arquivo único legado, era
  sobrescrito) ainda existe e é só **lido** como alternativa no perfil
  enquanto a pessoa não tiver versão. Passos: rodar
  `node scripts/backfill-resume-versions.js` (simula) → conferir →
  `--apply` → próxima migration livre remove a coluna e os arquivos legados
  (a `0023` virou o plano da empresa).
- **Retenção**: versão substituída apagada 12 meses depois de deixar de ser
  a atual (`lib/resumes/retention.ts`) — **valor provisório, pendente de
  validação jurídica**. A limpeza em si entra na etapa 2 da Fase 3.

### Triagem com IA (Fase 3) — processamento

Fluxo:

1. **Upload** (formulário público ou recrutador) → `storeResumeVersion`.
   Versão NOVA (hash nunca visto pra essa pessoa) chama
   `requestResumeAnalysis` **dentro da mesma transação**: confere a regra de
   disponibilidade, cria `resume_analyses` (PROCESSING, geração 1) e
   enfileira `resume.analyze`. Nunca processa no request. Mesmo PDF
   reenviado = mesma versão = nenhum processamento novo.
2. **Tarefa `resume.analyze`** (`lib/screening/analyzeResume.ts`):
   confere a regra DE NOVO (a config pode ter mudado; bloqueado → `SKIPPED`
   com o motivo) → extrai o texto do PDF (`unpdf`, uma vez por versão,
   salvo em `candidate_resumes.extracted_text`) → sem texto legível →
   `NO_TEXT`, **IA não é chamada** (OCR fora do escopo) → remove dados
   pessoais → limita a 12.000 caracteres → chama o provedor (só texto,
   nunca o PDF) → AJUSTA a resposta aos limites e valida
   (`parseScreeningOutput`); rejeitada tenta mais 1 vez, depois
   `FAILED`/`INVALID_OUTPUT` → `DONE`.

   **Validação tolerante** (desde 2026-09-25 — antes rejeitava respostas
   boas; o caso real foi "T.I." contado como fim de frase). AJUSTA em vez de
   rejeitar: resumo com mais de 3 frases/600 caracteres é cortado numa frase
   completa; base da experiência cortada em 200; tag com mais de 40
   caracteres descartada (só ela); mais de 8 tags → as 8 primeiras; mais de
   3 cargos → os 3 primeiros; experiência fora de 0–60 → null; campos extras
   ignorados; campo não essencial ausente → null/vazio. REJEITA só quando:
   não é JSON, falta o resumo (campo essencial) ou há termo proibido.
   Contagem de frases entende abreviações ("T.I.", "Ltda.", "S.A.") e só
   quebra antes de maiúscula. Termos proibidos são checados por PALAVRA
   INTEIRA com suporte a acento (`(?<!\p{L})…(?!\p{L})` — o `\b` do JS
   falha com "ç"/"ã"): "Universidade", "sexologia", "ração", "aprovação de
   crédito" passam.

   **Motivo técnico visível**: `INVALID_OUTPUT` e `INVALID_PDF` também
   FALHAM a tarefa (`PermanentTaskError`) com o motivo em `last_error` (ex.:
   "Resposta da IA rejeitada nas 2 tentativas (1ª: …; 2ª: …)") — aparece em
   Configurações → Tarefas ("Motivo técnico"), só ADMIN. O motivo nunca
   contém a resposta crua nem texto do currículo. Nessas falhas a tela
   mostra "Abrir perfil do candidato" em vez de reenviar (a nova geração se
   pede no card do perfil).
3. Cada fim (DONE, NO_TEXT, FAILED) registra evento na linha do tempo:
   `AI_SUMMARY_GENERATED` / `AI_SUMMARY_NO_TEXT` / `AI_SUMMARY_FAILED`, nas
   candidaturas enviadas com aquela versão (ou na mais recente da pessoa).
4. **Nada no pipeline altera `stage` nem `qualificationTag`** — decisão é
   sempre humana (testado em `tests/db/screening.test.ts`).

Erros: 429/503 do provedor → `TransientTaskError` (volta pra fila sem
consumir tentativa, respeitando Retry-After/RetryInfo; análise continua
PROCESSING). 400/401/403/404 → permanente (`FAILED`/`PROVIDER`). Outros →
nova tentativa normal; só vira `FAILED` na última. Config inválida →
`FAILED`/`CONFIG`, nenhuma chamada. Códigos em `resume_analyses.error_code`
são curtos e sem dado pessoal; mensagens de erro de provedor nunca carregam
o corpo da requisição.

**Regra de disponibilidade** (`lib/ai/availability.ts`, única):
candidato `isTest` → sempre processa (dispensa chave da empresa e
consentimento). Real → exige, nesta ordem, `AI_ALLOW_REAL_DATA=true`,
chave "Triagem com IA" da empresa ligada e consentimento `AI_SCREENING`
ativo. Textos da interface em `AI_BLOCK_REASON_LABELS` (sobre a
ferramenta, nunca "elegível").

**Minimização** (`lib/ai/redact.ts`), antes de enviar: e-mail, telefone,
CPF, RG, CEP e linhas de endereço, **todos** os links e @handles, o nome do
candidato (com/sem acento e caixa; completo e "primeiro último") e linhas
com nascimento/idade/estado civil/sexo/nacionalidade — trocados por
marcadores ([E-MAIL], [NOME]…) que o prompt manda ignorar. O texto
completo continua no banco (busca futura); só o ENVIADO é minimizado.

**Prompt** (`lib/ai/screening.ts`, `PROMPT_VERSION` gravado em cada
resultado): só fatos do currículo, `null` em vez de supor; proíbe inferir
ou mencionar idade, gênero, raça, religião, estado civil, saúde,
deficiência, aparência; proíbe nota, ranking e recomendação. Rede de
segurança: resumo/base que mencionar esses temas ou recomendar é recusado
como resposta inválida.

**Provedores** (`lib/ai/providers/`, `fetch` direto, sem SDK — status HTTP
à mão pro 429): `mock` (padrão; nenhuma chamada, exemplo fictício após
1,5s, mesmo formato e mesma validação do real — a interface mostra
"Exemplo simulado · sem IA"), `gemini` (Interactions API, `store:false`;
**envelope confirmado em chamada real em 2026-09-24**: o texto vem em
`steps[]` → item `type: "model_output"` → `content[].text`; antes dele há
um passo `type: "thought"` só com assinatura (ignorado); `status` diferente
de `"completed"` vira erro. A doc só mostra `output_text` — mantido como
fallback. Chave nova do AI Studio (prefixo `AQ.`) funciona no header
`x-goog-api-key`; `gemini-3.5-flash-lite` é modelo válido),
`openai` (Responses API, json_schema estrito, `store:false`). Trocar de
provedor = mudar env.

**Retenção**: pg_cron diário (06:00 UTC) cria `resume.purge_versions`;
apaga versões substituídas há mais de 12 meses (provisório — jurídico),
exceto as enviadas com candidatura em andamento. Arquivo primeiro, linha
depois.

`unpdf` está em `experimental.serverComponentsExternalPackages`
(`next.config.mjs`) — carregado do node_modules no servidor. Mudou o
`next.config.mjs`: reiniciar o `npm run dev`.

| Variável | Padrão | Uso |
|---|---|---|
| `AI_PROVIDER` | `mock` | `mock` \| `gemini` \| `openai`; valor inválido = erro (não cai pra mock em silêncio) |
| `AI_MODEL` | nenhum | obrigatório pra gemini/openai; nenhum nome de modelo no código — produção usa `gemini-3.5-flash-lite` (validado localmente em 2026-09-24) |
| `GEMINI_API_KEY` / `OPENAI_API_KEY` | nenhum | só no servidor, nunca `NEXT_PUBLIC_` |
| `AI_ALLOW_REAL_DATA` | `false` | só `"true"` libera candidato real. **Só com plano PAGO** — os termos do Gemini free proíbem dado pessoal e permitem revisão humana |

### Triagem com IA — interface

Leituras em `services/resumeAnalyses.ts` (sempre a versão ATUAL do
currículo e a geração mais recente); ações em
`app/(dashboard)/recrutamento/banco-de-talentos/aiActions.ts`.

- **Perfil da pessoa** — card "Resumo do currículo" (`AiSummaryCard`) acima
  do currículo; some se a pessoa não tem currículo. Mostra resumo,
  experiência (+ frase de base), formação, últimos cargos e tags. Rótulo
  "Gerado por IA · revise antes de decidir" (ou "Exemplo simulado · sem IA"
  no mock) + data, só com análise concluída. Estados: Processando (poll
  leve a cada 10s via `AutoRefresh` → `GET /api/analysis/[id]/status` →
  `router.refresh()` uma única vez ao terminar), Concluído, Falhou ("Tentar novamente";
  PDF ilegível pede nova versão em vez disso), Sem texto legível, e o motivo
  da ferramenta não rodar (`AI_BLOCK_REASON_LABELS`) — nesse caso nenhum
  botão de gerar aparece. "Gerar resumo"/"Gerar novamente" criam nova
  geração (bloqueado enquanto uma estiver Processando).
- **Tags editáveis** (`SkillTagsEditor`): clicar renomeia, "×" remove, "+
  Tag" adiciona (máx. 12, 40 caracteres); salva na hora e marca
  `skillsEditedAt`. "Gerar novamente" com tags editadas pede confirmação:
  "Manter minhas tags" (verde) / "Usar as tags da IA" (vermelho) / "X".
- **Cards** (kanban da vaga e lista do Banco de talentos,
  `AiCardSnippet`): até 3 tags + tempo de experiência, sem o resumo; selo
  "Teste" quando marcado.
- **Banco de talentos**: filtro "Todas as competências" (`?skill=`, sem
  diferenciar maiúsculas) — `tag` continua sendo a tag de TRIAGEM.
- **Linha do tempo**: `AI_SUMMARY_GENERATED` / `_NO_TEXT` / `_FAILED` com
  texto neutro sobre o resumo.
- **Upload**: `components/ui/FileDropzone.tsx` (arrastar ou clicar, mostra
  nome/tamanho, "×" vermelho pra tirar) no perfil e no formulário público —
  substitui o `<input type="file">` padrão. É um `<label>`: não colocar
  dentro de `FieldLabel`.
- **"Candidato de teste"** saiu do topo do perfil: fica no menu ⋮
  (`CandidateOptionsMenu`) na linha das abas, só pra ADMIN; o selo "Teste"
  aparece ao lado pra todos quando marcado.

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
2. Só é possível sair de `TRIAGE` pra frente (Entrevista/Teste/Proposta/
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

## Fila de tarefas em segundo plano (`BackgroundTask`)

**Validada em 2026-09-24**: os 14 testes de integração (`npm run test:db` —
bloqueio concorrente, novas tentativas, reagendamento por 429, recuperação
de tarefa travada) passaram no projeto Supabase de teste, pelo transaction
pooler.

Base das Fases 1 (e-mail) e 3 (triagem com IA) do Recrutamento. Tabela
`background_tasks` (migration `0021`) — **não confundir com `Job`, que é a
vaga**. Código em `lib/tasks/`:

- `queue.ts` — núcleo (enfileirar, pegar, executar, recuperar, limpar). Não
  importa `lib/prisma` nem `server-only`: recebe o banco e o registro por
  parâmetro, pra ser testável. Horários sempre do `now()` do banco.
- `index.ts` — atalhos do app já ligados ao Prisma: `enqueue(type, payload,
  { companyId, idempotencyKey?, runAt?, maxAttempts? }, tx?)` e
  `processTasks()`. Passe o `tx` de `prisma.$transaction` pra gravar a
  tarefa junto com a mudança que a originou.
- `handlers/index.ts` — **registro único de tipos** (`TASK_DEFINITIONS`). Cada
  fase cria o handler num arquivo da pasta com `defineTask({ type,
  payloadSchema (zod), handler })` e acrescenta uma linha aqui. Handlers
  importam de `../registry`/`../errors`, nunca de `@/lib/tasks` (circular).
- `errors.ts` — `TransientTaskError` e `PermanentTaskError` (abaixo).

### Ciclo de vida

`pending` → (pego) `running` → `done` | `pending` (nova tentativa) | `failed`.

- **Pegar tarefa**: um único comando (`WITH … FOR UPDATE SKIP LOCKED` +
  `UPDATE … RETURNING`) — seguro no transaction pooler, nenhuma transação
  fica aberta enquanto o handler roda. Uma por vez, em sequência, até 5 por
  execução ou 40s (a rota tem `maxDuration = 60`). Pegar já soma 1 em
  `attempts`.
- **Erro comum** → volta pra `pending` com espera crescente (30s × 4^(n−1),
  teto 1h, ±20%: ~30s, 2min, 8min, 32min, 1h). Esgotou `maxAttempts`
  (padrão 5) → `failed`.
- **`TransientTaskError`** (HTTP 429 e afins) → reagenda **sem consumir
  tentativa** (devolve a que foi contada, soma 1 em `deferrals`), usando o
  `retryAfterMs` se vier. Limite: `MAX_DEFERRALS = 10`; depois disso passa a
  contar como erro comum — nunca fica em loop.
- **`PermanentTaskError`**, tipo não registrado ou payload inválido →
  `failed` na hora.
- **Tarefa travada**: `running` há mais de 10 min (`STALE_AFTER_MS`) volta
  pra `pending` no início da próxima execução (ou `failed`, se era a última
  tentativa). Toda gravação de resultado exige `locked_by` = este
  processador — um processador antigo que "acorda" depois da recuperação tem
  o resultado descartado.
- **`idempotencyKey`** (única, opcional): enfileirar de novo com a mesma
  chave não faz nada (`enqueue` devolve `null`).
- **Retenção**: `done` apagada após 30 dias, `failed` após 90 (em lotes de
  500, no fim de cada execução). Apagar libera a `idempotencyKey`.

### Regras pra quem escreve handler

1. **Idempotente**: a mesma tarefa pode rodar mais de uma vez (entrega "pelo
   menos uma vez" — ex.: processo morreu depois do efeito e antes de gravar
   `done`).
2. **Sem dado pessoal em mensagem de erro** — vai pra `last_error`, que
   aparece na tela do ADMIN. Payload também nunca é exibido nem devolvido
   pela rota.
3. `companyId` sempre preenchido pra tarefa de empresa (senão ela não
   aparece em Configurações → Tarefas).

### Disparo (cron)

Cron da Vercel no Hobby roda no máximo 1x/dia — não serve. Usamos
**`pg_cron` + `pg_net` do Supabase**: `supabase/cron/process_tasks.sql`
(NÃO é migration — URL e segredo mudam por ambiente; os dois ficam no
Supabase Vault, não no repositório). Roda a cada minuto, mas **só chama a
rota se existir tarefa `pending` vencida ou `running` travada há mais de 10
min** — sem trabalho, nenhuma requisição. `timeout_milliseconds := 65000`
explícito (o padrão do pg_net, 5s, cortaria o processador). Execuções
sobrepostas são seguras (SKIP LOCKED). Os "10 minutos" existem em dois
lugares (SQL do cron e `STALE_AFTER_MS`) — mudar junto.

Rota `/api/cron/tasks`: `POST` com `Authorization: Bearer $CRON_SECRET`
(comparação em tempo constante). Sem `CRON_SECRET` responde 503 (fechada,
nunca aberta). Não há middleware no projeto — a rota é protegida só pelo
segredo. Em dev não há pg_cron: `npm run tasks:dev` (num segundo terminal)
chama a rota local a cada 15s.

Tela `/configuracoes/tarefas` (só ADMIN, card em Configurações): contagem
por status e as 20 últimas falhas da empresa, com "Tentar novamente" (zera
`attempts`/`deferrals` e volta pra `pending`; só age se ainda estiver
`failed`).

### Variáveis de ambiente

| Variável | Padrão | Uso |
|---|---|---|
| `CRON_SECRET` | nenhum (rota responde 503) | Bearer da rota; mesmo valor na Vercel e no Vault |
| `TEST_DATABASE_URL` | nenhum (`test:db` pula) | projeto Supabase de TESTE, transaction pooler (porta 6543) |
| `TEST_DIRECT_URL` | nenhum | projeto de TESTE, session pooler (5432) — só `test:db:setup` |

## Testes

```
npm test                 # unitários (sem banco): backoff, auth da rota, registro/validação
npm run test:db:setup    # 1x: aplica schema.sql (ou só a 0021) no projeto de TESTE
npm run test:db          # integração da fila no projeto de TESTE
```

- `test:db` usa um **segundo projeto Supabase, só de teste**, conectado
  pelo **transaction pooler** (mesmo modo da produção — a concorrência é
  testada nas mesmas condições). O helper recusa rodar se
  `TEST_DATABASE_URL` for do mesmo projeto de `DATABASE_URL`/`DIRECT_URL`
  ou se não for a porta 6543. Os testes **apagam** a tabela
  `background_tasks` do projeto de teste.
- **O projeto de teste pausa por inatividade** (plano free) — se
  `test:db`/`test:db:setup` falharem com erro de conexão (`ENOTFOUND`,
  `Tenant or user not found`, timeout), reativar o projeto no painel do
  Supabase antes de rodar de novo.
- Sem `TEST_DATABASE_URL`, `test:db` pula tudo com aviso (não falha).

## Tela Início (`app/(dashboard)/dashboard/page.tsx`)

Título = saudação neutra "Que bom ter você de volta, {primeiro nome}" (sem
emoji nem exclamação); o item do menu ("Início"), a aba do navegador e o
rótulo acima do título continuam iguais. Abaixo, a faixa "O que dizem sobre
o Inspect Talent" — só ADMIN e HR (EMPLOYEE vê só o título). O card "Seu plano" SAIU
da Início em 2026-09-25 (a pedido); `getMonthlyAiUsage` continua, pra etapa
4 (Configurações).

- **Depoimentos** (`components/inicio/TestimonialsStrip.tsx`, dados de
  `lib/testimonials.ts`): **FICTÍCIOS e provisórios** — pessoas e empresas
  inventadas, serão trocados pelos comentários reais com a MESMA estrutura
  (`Testimonial`). 10 depoimentos num CARROSSEL POR PÁGINA (framer-motion,
  sem rolagem nativa): página = cards visíveis — 3 no desktop (qualquer
  largura a partir de 1024px), 2 no tablet, 1 no celular; 32px entre os cards
  (no celular, card a 16px das bordas da tela). A fileira inteira desliza
  (~700ms, ease-in-out) na direção do movimento; depois da última volta à
  primeira pro mesmo lado (loop); última página incompleta é completada com
  os primeiros. Avanço automático a cada 6s, com pausa (mouse em cima, foco
  do teclado, arraste, aba oculta, botão Pausar/Continuar). Setas passam uma
  página, bolinhas abaixo levam à página, arrastar (dedo, mouse ou gesto
  horizontal do touchpad) troca de página; qualquer um reinicia os 6s.
  prefers-reduced-motion: sem avanço automático e sem animação.
  Card com o visual da referência (From Uiverse.io by Yaya12085), compacto e
  HORIZONTAL: ocupa 1/N da faixa (sem largura máxima), padding 0.75rem, texto 13px limitado a 3 linhas, nome/cargo/
  empresa em 1 linha (11px), etiqueta 11px, avatar 24px, ícones 16px, todos
  da mesma altura. Etiqueta com o
  segmento, "X" (Fechar, no lugar dos três pontos), depoimento entre aspas + nome · cargo · empresa, ações Amei /
  Comentar / Fixar e avatar com INICIAIS (nunca foto de pessoa real; se um
  dia houver `avatarUrl`, mostra a imagem). Diferenças: cursor default no
  card, sem contorno tracejado no hover (a pedido), ações alinhadas no fim.
  Comportamento só em memória (recarregou, voltou): Amei soma/subtrai 1,
  Fixar leva o card pro início, Comentar mostra "Em breve".
  **Fechar (X)**: o card some (opacidade + escala, ~250ms) e os seguintes
  deslizam (framer-motion, AnimatePresence + layout); com
  prefers-reduced-motion só desaparece. Os fechados ficam no localStorage
  (`inspect-talent:dismissed-testimonials`, leitura/escrita em try/catch) e
  continuam fechados ao recarregar; todos fechados = a seção some. **Quando
  os comentários forem reais, os fechamentos passam a ser salvos POR
  USUÁRIO no banco** (o localStorage é só provisório).

- **Uso mensal da IA**: contagem ÚNICA em `getMonthlyAiUsage` (`services/resumeAnalyses.ts`): análises
  `DONE` com IA real (`is_mock = false`) no mês corrente, fuso de São Paulo
  — resultado do mock NÃO conta. A etapa 4 (Configurações) usa a mesma.
- **"Precisa da sua atenção" — FORA DA TELA desde 2026-09-25** (trocado
  pelos depoimentos), mas a lógica continua pronta pra uso futuro em outro
  lugar: `services/attention.ts` + `components/inicio/AttentionCard.tsx`.
  Dados reais, uma pendência por
  vaga e tipo, as mais antigas primeiro, máx. 6; sem nenhuma: "Tudo em dia".
  - *Candidaturas novas*: criadas nos últimos 7 dias.
  - *Candidatos parados*: vaga aberta, etapa diferente de Contratado/
    Reprovado, sem mudança de etapa (`STAGE_CHANGED`) há mais de 7 dias —
    ou, se nunca mudou, candidatura com mais de 7 dias.
  - *Vaga sem candidaturas*: aberta há mais de 15 dias e nenhuma
    candidatura nos últimos 15 dias (título mostra os dias).
  Visual IDÊNTICO à referência (From Uiverse.io by Yaya12085): etiqueta
  azul `#1389eb` em todos os tipos, card de até 350px — só sem cursor de
  arrastar, botão de opções e visualizadores (sem função aqui).

## Planos (`lib/plans.ts`)

Fonte ÚNICA dos planos: id, nome, preço mensal em R$, descrição, itens e
limite mensal de currículos analisados por IA. **Todos os valores são
PLACEHOLDER** (nomes e preços definidos pelo negócio depois). Ordem da lista
= do mais básico ao mais alto; o primeiro é o padrão de toda empresa.
`Company.plan` (migration `0023`, sem check constraint — id desconhecido cai
no básico via `getPlan`). **Ainda não existe cobrança nem troca de plano**:
o plano só muda direto no banco.

- **Botão "Upgrade"** (`components/layout/UpgradeButton.tsx`, Server
  Component dentro do `Header`) à esquerda do sino: só ADMIN, some no plano
  mais alto, leva a `/configuracoes/planos`. 36px de altura (o sino tem 44).
  No celular (≤480px) mostra só o selo PRO + seta.
- **Página Planos**: um `PlanCard` por plano, lado a lado (empilhados no
  celular); plano atual marcado com botão "Seu plano atual" desativado;
  "Assinar" abre o aviso "Em breve" (`<dialog>`) com contato PROVISÓRIO
  (`PLAN_CONTACT_URL`).
- Componentes com referência visual do Uiverse.io (licença MIT) levam um
  comentário com a origem — manter ao editar.

## Design system — estado atual

Paleta em verde (`--green-700`/`--success` etc. em `app/globals.css`,
espelhada em `tailwind.config.ts`) — já mudou várias vezes nesta sessão,
checar visualmente antes de assumir que é a atual. Fonte base **Inter**
(`--apple-system, BlinkMacSystemFont` na frente do stack — SF Pro real em
Mac/iOS, Inter de fallback fora do ecossistema Apple, já que a fonte da
Apple não pode ser hospedada). Playfair Display só na wordmark do logo.

**Cores de botão — regra do sistema inteiro** (pedido do usuário,
2026-09-24):
- **Salvar / confirmar / atualizar / criar** → verde `#177f0f`
  (`--action-confirm`, `<Button variant="confirm">`).
- **Cancelar / excluir / remover** → vermelho `#fe0401` (`--action-cancel`:
  `variant="danger"` com texto, `variant="icon-cancel"` pro "X" ao lado de
  Atualizar, `round-cancel` nos toggles, cor do ícone de lixeira).
- `primary` (verde-escuro) fica só pra ação que não grava (ex.: alternar
  Lista/Kanban). Tokens espelhados em `tailwind.config.ts`
  (`confirm`/`cancel`). Tela nova: seguir a regra desde o início.
- Fora da regra por não serem salvar/cancelar: "Entrar" (login) e "Enviar
  link" (recuperar senha) continuam `primary`.

**Cadastro existente abre bloqueado** — padrão único em
`components/ui/EditLock.tsx` (`useEditLock` + `EditLockActions`), usado no
cadastro da vaga (`JobForm`) e no Perfil do candidato
(`CandidateProfileForm`): campos cinzas + "Editar" → campos liberados +
"Atualizar" (verde) com "X" (vermelho) ao lado que descarta e volta a
bloquear → salvou, bloqueia de novo. Validação roda no cliente com o MESMO
schema zod da action (e a action devolve `fieldErrors`): erro aparece
embaixo do campo (`FieldLabel error=`) e o que foi digitado não se perde.
Formulário novo (sem id) não bloqueia. Atualização do perfil do candidato
registra `PROFILE_UPDATED` na linha do tempo de todas as candidaturas da
pessoa, só com os NOMES dos campos alterados (sem os valores).

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
9. **Tabela nova precisa de RLS + revoke explícitos na própria migration**
   (`enable row level security` + `revoke all … from anon, authenticated`):
   o Supabase concede acesso a toda tabela nova, e o `revoke all on all
   tables` do `schema.sql` só valeu pras tabelas que existiam quando rodou.
   Ver `0021_background_tasks.sql`.

## Pendências conhecidas

- Upload real de documento do colaborador (`EmployeeDocument.fileUrl`):
  falta bucket no Supabase Storage, action de upload e componente de UI.
- `/gestao/relatorios`: removida, reconstrução (ou não) fica pra depois.
- `/pessoas`, `/desenvolvimento`, `/gestao` (visão geral do módulo): rota
  reservada no Sidebar (`group.href`), sem página própria — os módulos
  continuam desabilitados no menu, então não há redirect quebrado por
  enquanto.
- ATS Fase 1 (comunicação por e-mail — templates, Resend, gatilho por
  etapa, seleção em lote): planejada, não iniciada. A fila de tarefas que
  ela usa **já existe** (seção "Fila de tarefas em segundo plano") — falta
  só registrar o handler. `ApplicationEvent` já suporta os tipos
  `EMAIL_QUEUED/SENT/FAILED` no componente de timeline.
- ATS Fase 3 (triagem com IA): plano aprovado, em 4 etapas revisadas
  separadamente — (1) dados, (2) processamento, (3) interface, (4)
  Configurações + consentimento no formulário público. **Etapa 1 (dados)
  feita**: migration `0022` (versões de currículo, `resume_analyses`,
  `consents`, `Candidate.isTest`, `Company.aiScreeningEnabled`),
  versionamento nos dois uploads, selo/chave "Teste" no perfil, backfill.
  Aplicada em produção em 2026-09-24; backfill (simulação) encontrou 0
  currículos legados. **Etapa 2 (processamento) feita** — ver seção
  "Triagem com IA" abaixo. **Etapa 3 (interface) feita** — ver "Triagem
  com IA — interface". Falta a etapa 4 (Configurações + consentimento no
  formulário público).
  - **Testes de integração (`npm run test:db`) da Fase 3 rodam UMA vez, no
    final da fase**, junto com os de todas as etapas — até lá só os
    unitários (`npm test`) são executados a cada etapa.
  Decisões já tomadas:
  - **Consentimento** genérico (tabela `consents`: finalidade, versão e hash
    do texto, data/hora, candidatura). Formulário público com dois
    checkboxes: tratamento da candidatura (obrigatório) e análise por IA
    (opcional). **Recusar a IA não pode prejudicar o candidato em nada.**
  - **Textos da interface quando a IA não roda** falam da FERRAMENTA, nunca
    do candidato: "Análise por IA não autorizada pelo candidato" (sem
    consentimento), "Triagem com IA desativada" (chave da empresa),
    "Triagem com IA indisponível" (`AI_ALLOW_REAL_DATA=false`). **Nunca usar
    "elegível"/"inelegível" na interface.**
  - Antes de enviar à IA, remover também o nome do candidato e linhas com
    dados pessoais rotulados (nascimento, idade, estado civil, sexo,
    nacionalidade).
- **Retenção de versões de currículo (12 meses)**: valor provisório,
  pendente de validação jurídica (`lib/resumes/retention.ts`).
- **Backfill + migration de remoção** (próxima livre; a `0023` virou o plano
  da empresa): rodar `scripts/backfill-resume-versions.js`
  e só depois remover `candidates.resume_path` e os arquivos legados.
- Arquivos do Storage não são apagados quando um candidato é excluído
  (linhas somem por cascade, PDFs ficam) — tratar junto da política geral
  de retenção.

## Pendências futuras

- **Link de consentimento para candidato cadastrado manualmente**: o
  recrutador envia um link ao candidato que não passou pelo formulário
  público, pra ele poder dar (ou não) o consentimento da análise por IA.
  Hoje esses candidatos nunca passam pela triagem com IA (exceto os de
  teste).

## Pendências antes do primeiro cliente

- **Vercel Hobby é só pra uso não comercial** — migrar pro plano Pro antes
  de ter cliente pagante.
- **Supabase free pausa o projeto por inatividade e não tem backup
  automático** — migrar pro plano pago antes de ter cliente pagante (além
  do backup, evita a produção pausar num período sem acesso).
- **Remover ou substituir os depoimentos FICTÍCIOS da Início**
  (`lib/testimonials.ts`) — pessoas e empresas inventadas; **não podem ser
  exibidos a clientes reais**. Substituir pela funcionalidade de comentários
  reais (mesma estrutura de dados) ou tirar a faixa.
- **Trocar credenciais expostas fora do ambiente local**: a
  `SUPABASE_SERVICE_ROLE_KEY`, a senha do banco de produção e a senha do
  administrador. Usar senhas **diferentes** pro banco e pro login do
  administrador. Depois de trocar, atualizar `.env.local` e as variáveis na
  Vercel (`DATABASE_URL`/`DIRECT_URL` carregam a senha do banco).
- **Trocar domínio e nome do projeto na Vercel pro nome novo (Inspect
  Talent)**, com redirecionamento permanente do domínio antigo pro novo (links
  públicos de vagas já divulgados continuam funcionando). Junto: atualizar o
  segredo `tasks_cron_url` no Supabase Vault (senão o pg_cron para de chamar
  a fila — ver `supabase/cron/process_tasks.sql`) e as URLs de redirecionamento
  do Supabase Auth (Site URL / Redirect URLs).

## Rodando localmente / testando em rede

```
npm run dev          # só localhost:3000
npm run dev:lan       # 0.0.0.0:3000 — acessível por outras máquinas na rede
```
Pra acesso por IP da rede local funcionar de verdade, o IP precisa estar
listado em `allowedDevOrigins` no `next.config.mjs`.

# Inspect Human — Contexto de desenvolvimento

> Este arquivo documenta o **estado real** do projeto (o que foi de fato
> construído) — diferente do `ARCHITECTURE.md`, que é o plano original
> pré-implementação e já está desatualizado em vários pontos (paleta azul,
> sidebar de 240px, fases, folha/ponto/budget que não existem mais). Use
> este arquivo pra retomar contexto rápido.

## Redução de escopo (mudança mais recente)

O produto deixou de cobrir folha de pagamento, ponto e orçamento — foco
agora é **só recrutamento + desenvolvimento de colaboradores** (ficha
completa continua existindo, incluindo desligamentos/turnover). Tabelas
`time_clocks`, `payroll_variables`, `budgets`, `budget_expenses` foram
dropadas (migrations `0014`/`0015`); rotas, sidebar, services e componentes
correspondentes foram removidos. Em troca, entrou `EmployeeDocument`
(`employee_documents`, migration `0013`) — anexo de documento na ficha do
colaborador, mas **sem upload real implementado ainda** (só a tabela e o
campo `fileUrl`/path existem; falta bucket no Storage + action + UI).

Detalhe completo de tudo que saiu/entrou: `BACKEND_CONTEXT.md`, seção
"Redução de escopo".

**Pendência registrada, não decidida ainda:** `/gestao/relatorios` foi
removida (era 100% conteúdo de orçamento, nada sobrava sem `budget`). Se um
dia quiser uma tela de Relatórios focada em recrutamento/desenvolvimento,
é reconstrução do zero, não algo que existe escondido em algum lugar.

## Stack (verificado em `package.json`)

- **Next.js 14** (App Router), React 18, TypeScript.
- **Prisma 7** com `@prisma/adapter-pg`, schema multi-schema (`public` +
  `auth`), migrations manuais em `supabase/migrations/*.sql` (não usa
  `prisma migrate`) — `supabase/schema.sql` é o documento de referência
  "do zero" e precisa ser mantido em sincronia com as migrations.
- **Supabase**: Postgres + Auth (`@supabase/ssr` no servidor,
  `@supabase/supabase-js` no cliente só pra login/logout).
- **Tailwind CSS 3** + um design system legado em classes `fin-*`
  (`app/globals.css`) — os dois convivem: telas mais antigas usam `fin-*`,
  telas mais novas (Sidebar, Dashboard) usam utilitários Tailwind direto.
- `@dnd-kit/*` (kanban de candidatos), `framer-motion` (transição de
  página), `zod` (validação de schemas). **`recharts` foi removido** (só
  existia pro gráfico de pizza do Budget, que saiu) — reinstalar se algum
  gráfico voltar a ser necessário em Recrutamento/Desenvolvimento.

## Rotas implementadas

```
Públicas
  /                              landing
  /login, /cadastro, /recuperar-senha
  /empresa/[slug]/vagas          lista pública de vagas
  /empresa/[slug]/vagas/[jobId]  candidatura pública
  /api/public/signup             route handler (confirmado no build; único
                                  em app/api/ — a rota de candidatura via
                                  route handler citada no ARCHITECTURE.md
                                  não existe como arquivo separado)

Dashboard (grupo (dashboard), sessão + role ADMIN|HR)
  /dashboard
  /colaboradores, /colaboradores/novo, /colaboradores/[id]/editar
  /desligamentos
  /recrutamento/vagas, /recrutamento/vagas/[jobId]
  /recrutamento/candidatos, /recrutamento/candidatos/[candidateId]
  /desenvolvimento/trilhas, /desenvolvimento/progresso
  /gestao/kpis
  /configuracoes
```

`app/exemplo-sidebar/` é um componente de exploração/rascunho, não faz parte
do fluxo real do produto.

## Sidebar (`components/layout/Sidebar.tsx`)

- Largura 280px expandida / 76px recolhida (`localStorage`, sobrevive a
  reload). Botão de recolher/expandir fica **acima de "Configurações"**, no
  bloco inferior — seta + texto "Recolher" quando aberta, só o ícone quando
  fechada.
- Itens agrupados por rótulos de seção em maiúsculas: **PRINCIPAL**
  (Dashboard) · **PESSOAS** (Pessoas, Recrutamento, Desenvolvimento) ·
  **ANÁLISE** (Gestão, que hoje só tem KPIs — Relatórios e Budget saíram).
  A seção OPERAÇÕES (Ponto, Folha) foi removida inteira na redução de
  escopo. Cada grupo é um acordeão com sub-itens reais (ex.: Pessoas →
  Colaboradores/Desligamentos).
- Estado ativo: fundo cinza-claro preenchido (`bg-gray-100`), sem contorno
  colorido — quando recolhida, o ícone da seção atual fica com contorno
  (`border`), calculado a partir da rota (`groupForPath`), independente do
  acordeão estar aberto ou fechado manualmente.
- Sem logo/wordmark no topo (removido a pedido) — começa direto no perfil
  do usuário (avatar com iniciais + nome + empresa).

## Design system — estado atual (já passou por 3 paletas diferentes)

A paleta **mudou várias vezes** nesta sessão, sempre pelo mesmo mecanismo:
os *nomes* das CSS vars em `app/globals.css` (`--green-900`, `--gray-*`,
etc.) e das cores do Tailwind (`tailwind.config.ts`) continuam os mesmos,
só os valores hexadecimais são trocados — isso propaga a cor nova pro app
inteiro sem reescrever cada tela.

**Paleta atual (última pedida — referência em Uizard):**
- Primária/ativo: quase-preto `#131313` (`--green-900` / `primary`)
- Accent/tendência positiva: verde-água `#14b8a6` (`--green-700` /
  `accent` / `--success`)
- Fundo da página: `#fafaf9`; cards brancos; bordas `#e5e3df`
- Fonte base: **Inter** (`next/font/google`, variável `--font-inter`)
- Fonte serifada (**Playfair Display**, variável `--font-logo`): reservada
  **só** pro wordmark "Inspect Human" — não usar em títulos de página nem de
  card (já foi tentado e revertido a pedido do usuário).

Histórico rápido (caso precise reverter ou entender um diff antigo):
verde escuro original (`#253D2C`/`#2E6F40`) → paleta de um protótipo Figma
Make (`#2d5a2d`/`#3d7a3d`, fundo bege) → paleta atual em preto+teal (Uizard).
**Antes de reintroduzir verde**, checar se o usuário não pediu de novo —
não é uma preferência estável, mudou a cada nova referência visual trazida.

`StatCard` (`components/ui/StatCard.tsx`) tem duas variantes: `selected`
(card preto em destaque, usado 1x por página) e a normal (branca, ícone +
tendência com seta). Ambas aceitam `icon`/`trend`/`meta` opcionais —
a tela de KPIs só passa `label`/`value`/`meta` e continua funcionando sem
ícone.

## Armadilhas já descobertas (não repetir)

1. **Server Action recebendo função como prop/children, vindo de Server
   Component**: quebra em runtime ("Functions are not valid as a child of
   Client Components"). Componentes de toggle (ex.: `NewExitToggle`)
   precisam receber só dados serializáveis (arrays/strings) e renderizar o
   formulário *internamente*, nunca aceitar um `children: (close) => JSX`
   vindo de uma página Server Component.
2. **`navigator.clipboard.writeText()` exige contexto seguro** (HTTPS ou
   `localhost`) — falha silenciosamente ao acessar via IP da rede local em
   HTTP puro (`http://192.168.x.x:3000`, como é testado aqui). O
   `CopyLinkButton` já tem fallback via `document.execCommand("copy")`.
3. **`npm run dev:lan` + acesso por IP**: Next bloqueia assets `/_next/*`
   de origem diferente de localhost a menos que `allowedDevOrigins` no
   `next.config.mjs` liste o IP da máquina — sem isso, páginas client
   carregam mas nunca hidratam (formulários "não fazem nada").
4. **Nunca rodar dois processos de dev ao mesmo tempo** (`npm run dev` num
   terminal + `npm run dev:lan` em outro) — os dois disputam a porta 3000 e
   o cache `.next`, corrompendo o `build-manifest.json` e causando 404/500
   aleatórios. Sempre `taskkill //F //IM node.exe` antes de subir um novo.
5. **Comentário CSS nunca pode conter `*/` no meio do texto** (ex.:
   `--green-*/--surface-*`) — fecha o comentário na hora errada e quebra o
   PostCSS com "Unknown word".
6. Ordem de cascata em `app/globals.css`: como o arquivo abre com
   `@tailwind base/components/utilities`, os utilitários do Tailwind são
   injetados **no topo**, então classes customizadas declaradas mais abaixo
   no mesmo arquivo (ex. `.brand-wordmark`) **vencem** utilitários Tailwind
   de mesma especificidade (ex. `text-lg`) aplicados no componente. Pra
   sobrescrever, criar uma classe customizada dedicada (ex.
   `.brand-wordmark--sm`) em vez de confiar numa utility class do Tailwind.
7. Ao remover uma tabela/model, checar também páginas que **dependem dela
   por completo** mesmo sem estar na lista óbvia de remoção — foi o caso de
   `/gestao/relatorios`, que não tinha nada além de conteúdo de budget e só
   foi descoberta ao grepar o arquivo antes de apagar `services/budget.ts`.

## Pendências conhecidas

- Upload real de documento do colaborador (`EmployeeDocument.fileUrl`):
  falta bucket no Supabase Storage, action de upload e componente de UI na
  ficha do colaborador. Mesmo gap que já existia em `Candidate.resumePath`.
- `/gestao/relatorios`: removida, decisão de reconstruir (ou não) fica pra
  depois — ver seção "Redução de escopo" acima.
- Dashboard (`app/(dashboard)/dashboard/page.tsx`) ainda usa dados
  mockados (comentário "Dados de exemplo — Fase 1"), incluindo as seções
  Pessoas/Recrutamento — trocar por dados reais dos services quando a
  paleta/layout estiverem aprovados definitivamente.
- Barra de busca do Header (`searchPlaceholder`) é só visual, sem lógica de
  busca implementada.
- Animações de abertura/fechamento de formulários e efeitos de clique em
  botão ainda não foram revisados de ponta a ponta (pedido antigo, "suave
  em todo lugar" — parcialmente coberto pela transição de página via
  `framer-motion` em `components/layout/PageTransition.tsx`).

## Rodando localmente / testando em rede

```
npm run dev          # só localhost:3000
npm run dev:lan       # 0.0.0.0:3000 — acessível por outras máquinas na rede
```
Pra acesso por IP da rede local funcionar de verdade, o IP precisa estar
listado em `allowedDevOrigins` no `next.config.mjs`.

-- ============================================================================
-- Orçamento por departamento/categoria (Gestão > Budget).
-- "department" é texto livre (mesmo valor usado em users.department e nas
-- opções da categoria SETOR) — sem FK, mesma convenção já usada no projeto.
-- ============================================================================

create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  department text not null,
  category text not null,
  competence date not null,
  amount numeric(12, 2) not null,
  created_at timestamptz not null default now(),
  constraint budgets_category_check check (category in ('SALARIO', 'TREINAMENTO', 'CONFRATERNIZACOES')),
  constraint budgets_competence_check check (competence = date_trunc('month', competence)::date),
  constraint budgets_unique unique (company_id, department, category, competence)
);
create index if not exists idx_budgets_company_competence on budgets (company_id, competence);

create table if not exists budget_expenses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  department text not null,
  category text not null,
  description text,
  amount numeric(12, 2) not null,
  expense_date date not null,
  created_at timestamptz not null default now(),
  constraint budget_expenses_category_check check (category in ('SALARIO', 'TREINAMENTO', 'CONFRATERNIZACOES'))
);
create index if not exists idx_budget_expenses_company_dept_cat on budget_expenses (company_id, department, category);
create index if not exists idx_budget_expenses_company_date on budget_expenses (company_id, expense_date);

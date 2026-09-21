-- ============================================================================
-- Orçamento passa de "um valor fixo por mês" pra "um valor com vigência"
-- (start_date/end_date) e status (ATIVO/SUSPENSO). Permite cadastrar um
-- orçamento pra vigorar a partir de uma data futura, editar um orçamento
-- existente e consultar/suspender orçamentos.
-- ============================================================================

alter table budgets drop constraint if exists budgets_unique;
alter table budgets drop constraint if exists budgets_competence_check;

alter table budgets rename column competence to start_date;
alter table budgets add column if not exists end_date date;
alter table budgets add column if not exists status text not null default 'ATIVO';
alter table budgets add column if not exists updated_at timestamptz not null default now();

do $$
begin
  alter table budgets add constraint budgets_status_check check (status in ('ATIVO', 'SUSPENSO'));
exception
  when duplicate_object then null;
end $$;

create index if not exists idx_budgets_company_department on budgets (company_id, department, category);
create index if not exists idx_budgets_company_status on budgets (company_id, status);

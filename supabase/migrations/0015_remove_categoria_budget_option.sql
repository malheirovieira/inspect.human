-- ============================================================================
-- 0015_remove_categoria_budget_option.sql
-- Continuação da redução de escopo (0014 já removeu budgets/budget_expenses).
-- Remove as linhas órfãs de company_options com category='CATEGORIA_BUDGET'
-- (7 linhas confirmadas antes de rodar, dado de demo) e estreita o check
-- constraint de volta pra excluir essa categoria.
-- ============================================================================

delete from public.company_options where category = 'CATEGORIA_BUDGET';

alter table public.company_options
  drop constraint company_options_category_check;
alter table public.company_options
  add constraint company_options_category_check
    check (category in ('SETOR', 'HORARIO_TRABALHO', 'MODALIDADE_CONTRATACAO'));

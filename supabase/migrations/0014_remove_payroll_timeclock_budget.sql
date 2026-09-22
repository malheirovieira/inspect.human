-- ============================================================================
-- 0014_remove_payroll_timeclock_budget.sql
-- DESTRUTIVA. Redução de escopo: o produto passa a focar só em
-- recrutamento + desenvolvimento de colaboradores.
--
-- Backup feito antes desta migration (CSV, dado de demo):
--   supabase/backups/budgets_*.csv          (15 linhas)
--   supabase/backups/budget_expenses_*.csv  (4 linhas)
-- payroll_variables e time_clocks estavam vazias (0 linhas) — nada a
-- preservar ali.
--
-- Nenhuma outra tabela do schema tem FK apontando para budgets,
-- budget_expenses, payroll_variables ou time_clocks — confirmado lendo
-- prisma/schema.prisma inteiro antes de escrever este DROP.
--
-- Aplicar com:
--   npx prisma db execute --file supabase/migrations/0014_remove_payroll_timeclock_budget.sql
--   npx prisma generate
-- Depois atualizar supabase/schema.sql manualmente (remover as 4 seções
-- correspondentes).
-- ============================================================================

drop table if exists public.budget_expenses cascade;
drop table if exists public.budgets cascade;
drop table if exists public.time_clocks cascade;
drop table if exists public.payroll_variables cascade;

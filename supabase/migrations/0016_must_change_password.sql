-- ============================================================================
-- 0016_must_change_password.sql
-- Aditiva, sem risco. Coluna que força troca de senha no primeiro login
-- pra contas criadas com senha temporária (inviteUser, createColaborador).
-- ============================================================================

alter table public.users
  add column must_change_password boolean not null default false;

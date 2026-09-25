-- ============================================================================
-- 0023_company_plan.sql
-- Aditiva, sem risco. Plano da empresa (lib/plans.ts é a fonte da lista:
-- nomes, preços, itens e limite mensal da triagem com IA — hoje PLACEHOLDER).
-- Ainda não existe cobrança nem troca de plano pela interface.
--
-- Sem check constraint de propósito: os ids dos planos podem mudar quando os
-- nomes forem definidos; valor desconhecido cai no plano básico no código
-- (getPlan). Padrão = o plano mais básico ('essencial').
--
-- (A remoção de candidates.resume_path, antes prevista como "0023", passa a
-- ser a próxima migration livre.)
--
-- Aplicar com:
--   npx prisma db execute --file supabase/migrations/0023_company_plan.sql
--   npx prisma generate
-- Depois atualizar supabase/schema.sql manualmente.
-- ============================================================================

alter table public.companies
  add column plan text not null default 'essencial';

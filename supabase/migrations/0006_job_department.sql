-- ============================================================================
-- Adiciona "setor" (departamento) à vaga. Mesma convenção de texto livre
-- usada em users.department — sem FK pra company_options.
-- ============================================================================

alter table jobs add column if not exists department text;

-- ============================================================================
-- Cronograma planejado da vaga: prazo de recebimento de currículos, prazo
-- de entrevistas, prazo de contratação/envio de documentos e previsão de
-- início. Só informativo por enquanto — nada fecha automaticamente.
-- ============================================================================

alter table jobs add column if not exists resume_deadline date;
alter table jobs add column if not exists interview_deadline date;
alter table jobs add column if not exists hiring_deadline date;
alter table jobs add column if not exists expected_start_date date;

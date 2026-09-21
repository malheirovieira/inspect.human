-- ============================================================================
-- Candidatura pública (MVP) ainda não faz upload de currículo pro Storage
-- (fase futura). Até lá, candidates.resume_path fica opcional.
-- ============================================================================

alter table candidates alter column resume_path drop not null;

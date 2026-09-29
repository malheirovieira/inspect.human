-- Performance: índice em resume_analyses(resume_id, status, generation DESC)
--
-- As funções getAiSnippets e getCandidateIdsWithSkill executam:
--
--   SELECT DISTINCT ON (c.id) ...
--   FROM candidates c
--   JOIN resume_analyses ra
--     ON ra.resume_id = c.current_resume_id AND ra.status = 'DONE'
--   WHERE c.company_id = $1 AND c.id = ANY($2)
--   ORDER BY c.id, ra.generation DESC
--
-- O índice existente idx_resume_analyses_company_completed cobre
-- (company_id, completed_at) WHERE status='DONE' — útil para relatórios,
-- mas não para este JOIN que acessa por resume_id.
-- A unique constraint (resume_id, generation) existe como B-tree e já
-- ajuda, mas sem o filtro status='DONE' o índice parcial abaixo é
-- mais eficiente para o padrão real de acesso.
create index idx_resume_analyses_resume_status_gen
  on public.resume_analyses (resume_id, status, generation desc);

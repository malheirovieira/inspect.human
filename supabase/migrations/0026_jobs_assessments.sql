-- Fase 2 Parte 3.5: Vincular testes às vagas
-- Permite associar um assessment (teste) a uma vaga
-- Quando candidato é movido para stage "TEST", o link de avaliação é gerado automaticamente

alter table jobs
  add column assessment_id uuid references assessments(id) on delete set null;

create index idx_jobs_assessment on jobs(assessment_id) where assessment_id is not null;

-- ============================================================================
-- 0020_drop_process_steps_and_candidate_notes.sql
-- Reorganização da página do candidato: checklist da candidatura deixa de
-- ter armazenamento próprio (era applications.process_steps) e passa a ser
-- 100% derivado de applications.stage (mesma fonte que o Kanban usa) — ver
-- schemas/candidate.ts (PIPELINE_STAGES) e CandidateProcessChecklist.tsx.
--
-- candidates.notes também sai: anotações agora são um tipo de evento
-- (NOTE_ADDED em application_events), por candidatura, não pela pessoa.
-- Checado antes desta migration: 0 candidatos tinham anotação preenchida,
-- então não há dado real pra migrar.
--
-- Aplicar com:
--   npx prisma db execute --file supabase/migrations/0020_drop_process_steps_and_candidate_notes.sql
--   npx prisma generate
-- Depois atualizar supabase/schema.sql manualmente.
-- ============================================================================

alter table public.applications drop column if exists process_steps;
alter table public.candidates drop column if exists notes;

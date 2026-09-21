-- ============================================================================
-- Tag manual de qualificação do candidato (independente da etapa do
-- pipeline): GREEN/YELLOW/BLUE/RED/GRAY. Ver schemas/candidate.ts.
-- ============================================================================

alter table candidates add column if not exists qualification_tag text;

do $$
begin
  alter table candidates add constraint candidates_qualification_tag_check
    check (qualification_tag in ('GREEN', 'YELLOW', 'BLUE', 'RED', 'GRAY'));
exception
  when duplicate_object then null;
end $$;

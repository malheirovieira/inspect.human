-- ============================================================================
-- Suporte a drag-and-drop no Kanban de candidatos: posição manual dentro da
-- coluna, e títulos de etapa customizáveis por empresa.
-- ============================================================================

alter table candidates add column if not exists position integer not null default 0;

create table if not exists kanban_stage_labels (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  stage text not null,
  label text not null,
  constraint kanban_stage_labels_unique unique (company_id, stage)
);

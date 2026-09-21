-- ============================================================================
-- Listas configuráveis pela empresa (Setor, Horário de Trabalho, Modalidade
-- de Contratação) + campo "setor" no colaborador.
-- ============================================================================

create table if not exists company_options (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  category text not null,
  label text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint company_options_category_check
    check (category in ('SETOR', 'HORARIO_TRABALHO', 'MODALIDADE_CONTRATACAO')),
  constraint company_options_unique unique (company_id, category, label)
);
create index if not exists idx_company_options_company_category on company_options (company_id, category);

alter table users add column if not exists department text;

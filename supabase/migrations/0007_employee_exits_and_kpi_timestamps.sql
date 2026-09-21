-- ============================================================================
-- Sustenta os KPIs de RH (Gestão > KPIs):
-- - employee_exits: turnover, turnover dos 90 dias.
-- - jobs.published_at / candidates.hired_at: time-to-hire.
-- ============================================================================

alter table jobs add column if not exists published_at timestamptz;
alter table candidates add column if not exists hired_at timestamptz;

create table if not exists employee_exits (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  user_id uuid unique references users (id) on delete set null,
  user_name text not null,
  department text,
  position text,
  admission_date date,
  exit_date date not null,
  exit_type text not null,
  reason text not null,
  notes text,
  rehire_eligible boolean,
  created_by uuid references users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint employee_exits_exit_type_check check (exit_type in ('VOLUNTARIA', 'INVOLUNTARIA')),
  constraint employee_exits_reason_check check (
    reason in ('PEDIU_DEMISSAO', 'SEM_JUSTA_CAUSA', 'JUSTA_CAUSA', 'FIM_DE_CONTRATO', 'APOSENTADORIA', 'OUTRO')
  )
);
create index if not exists idx_employee_exits_company_date on employee_exits (company_id, exit_date);

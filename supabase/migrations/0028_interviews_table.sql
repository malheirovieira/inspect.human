-- Fase 1: Agendamento de Entrevista

create table interviews (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references applications(id) on delete cascade,
  scheduled_at timestamptz not null,
  scheduled_by uuid not null references auth.users(id),
  status text not null default 'SCHEDULED',
  notes text,
  created_at timestamptz not null default now(),
  constraint interviews_status_check check (status in ('SCHEDULED', 'COMPLETED', 'CANCELLED'))
);

create index idx_interviews_application_id on interviews(application_id);
create index idx_interviews_scheduled_at on interviews(scheduled_at);

alter table interviews enable row level security;
revoke all on interviews from anon, authenticated;

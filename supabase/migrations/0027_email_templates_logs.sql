-- Fase 1: Comunicação & Engajamento
-- Tabelas para templates de e-mail e log de envios

create table email_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  subject text not null,
  body_html text not null,
  created_at timestamptz not null default now(),
  constraint email_templates_name_unique unique (company_id, name)
);
create index idx_email_templates_company on email_templates(company_id);

create table email_logs (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  template_id uuid not null references email_templates(id) on delete cascade,
  recipient_email text not null,
  subject text not null,
  body_html text not null,
  status text not null default 'queued',
  sent_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  constraint email_logs_status_check check (status in ('queued', 'sent', 'failed'))
);
create index idx_email_logs_application on email_logs(application_id);
create index idx_email_logs_status on email_logs(status) where status in ('queued', 'failed');
create index idx_email_logs_created_at on email_logs(created_at desc) where status = 'sent';

-- RLS
alter table email_templates enable row level security;
alter table email_logs enable row level security;

revoke all on email_templates, email_logs from anon, authenticated;

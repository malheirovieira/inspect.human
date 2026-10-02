create table if not exists public.exit_analysis_reports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  period_from date not null,
  period_to date not null,

  recommendations text,
  recommendations_updated_at timestamptz,
  recommendations_updated_by uuid references public.users(id) on delete set null,

  -- IDLE | PENDING | DONE | FAILED | INSUFFICIENT_DATA
  theme_status text not null default 'IDLE',
  theme_result jsonb,
  theme_responses_analyzed integer,
  theme_provider text,
  theme_model text,
  theme_is_mock boolean not null default false,
  theme_error_code text,
  theme_requested_at timestamptz,
  theme_completed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (company_id, period_from, period_to)
);

create index if not exists idx_exit_analysis_reports_company on public.exit_analysis_reports (company_id);

alter table public.exit_analysis_reports enable row level security;
revoke all on public.exit_analysis_reports from anon, authenticated;

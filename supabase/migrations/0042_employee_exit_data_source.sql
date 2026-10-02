alter table public.employee_exits
  add column if not exists data_source text not null default 'manual',
  add column if not exists external_ref text;

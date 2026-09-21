-- ============================================================================
-- Inspect Human — schema PostgreSQL (MVP)
-- Alvo: Supabase Postgres. Rode no SQL Editor do projeto Supabase.
--
-- Modelo de segurança: o acesso normal de leitura/escrita acontece via
-- servidor Next.js usando a service_role (Prisma), que sempre filtra por
-- company_id resolvido a partir da sessão autenticada. RLS aqui é uma rede
-- de segurança: revogamos privilégios de anon/authenticated no schema
-- inteiro, então mesmo que uma chave anon vaze, nada é legível/gravável
-- diretamente. A service_role do Supabase ignora RLS por design.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- companies
-- ----------------------------------------------------------------------------
create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint companies_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint companies_slug_unique unique (slug)
);

-- ----------------------------------------------------------------------------
-- users — extensão 1:1 de auth.users (Supabase Auth), nunca criada solta.
-- role/company_id vêm sempre desta tabela, nunca do JWT bruto ou do cliente.
-- ----------------------------------------------------------------------------
create table users (
  id uuid primary key references auth.users (id) on delete cascade,
  company_id uuid not null references companies (id) on delete cascade,
  name text not null,
  email text not null,
  role text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Ficha de colaborador (cadastro RH) — ver migrations/0001_colaborador_hr_fields.sql
  -- para o detalhe de quando cada bloco foi adicionado. Tudo opcional aqui;
  -- obrigatoriedade é validada na aplicação (schemas/colaborador.ts).
  birth_date date,
  sex text,
  nationality text,
  birthplace text,
  marital_status text,
  mother_name text,
  father_name text,
  address_zip text,
  address_street text,
  address_number text,
  address_complement text,
  address_neighborhood text,
  address_city text,
  address_state text,
  phone text,
  education_level text,
  race_color text,
  cpf text,
  id_document_type text,
  id_document_number text,
  ctps_number text,
  pis_number text,
  voter_title_number text,
  reservist_certificate text,
  civil_registry_type text,
  civil_registry_number text,
  department text,
  position text,
  admission_date date,
  salary numeric(12, 2),
  work_schedule text,
  registration_number text,
  bank_name text,
  bank_agency text,
  bank_account text,
  transport_voucher_opt_in boolean,
  dependents jsonb,
  admission_exam_date date,
  admission_exam_result text,

  constraint users_role_check check (role in ('ADMIN', 'HR', 'EMPLOYEE')),
  constraint users_company_email_unique unique (company_id, email),
  constraint users_company_cpf_unique unique (company_id, cpf)
);
create index idx_users_company on users (company_id);
create index idx_users_company_active on users (company_id, active);

-- ----------------------------------------------------------------------------
-- jobs
-- ----------------------------------------------------------------------------
create table jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  title text not null,
  description text not null,
  department text,
  location text,
  work_mode text not null,
  employment_type text,
  status text not null default 'DRAFT',
  published_at timestamptz,
  resume_deadline date,
  interview_deadline date,
  hiring_deadline date,
  expected_start_date date,
  created_by uuid references users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint jobs_status_check check (status in ('DRAFT', 'OPEN', 'CLOSED')),
  constraint jobs_work_mode_check check (work_mode in ('PRESENCIAL', 'REMOTO', 'HIBRIDO'))
);
create index idx_jobs_company on jobs (company_id);
create index idx_jobs_company_status on jobs (company_id, status);
-- usada pela página pública de vagas (filtra por slug da empresa + status aberto)
create index idx_jobs_open on jobs (company_id, created_at desc) where status = 'OPEN';

-- ----------------------------------------------------------------------------
-- candidates
-- company_id é sempre copiado do job no momento do insert (trigger abaixo),
-- nunca aceito do payload do formulário público.
-- ----------------------------------------------------------------------------
create table candidates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  job_id uuid not null references jobs (id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  linkedin_url text,
  resume_path text,
  stage text not null default 'TRIAGE',
  position integer not null default 0,
  qualification_tag text,
  hired_at timestamptz,
  process_steps jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint candidates_stage_check check (stage in ('TRIAGE', 'INTERVIEW', 'PROPOSAL', 'HIRED')),
  constraint candidates_qualification_tag_check check (qualification_tag in ('GREEN', 'YELLOW', 'BLUE', 'RED', 'GRAY'))
);
create index idx_candidates_company on candidates (company_id);
create index idx_candidates_job on candidates (company_id, job_id);
create index idx_candidates_stage on candidates (company_id, job_id, stage);

create or replace function candidates_set_company_id()
returns trigger language plpgsql as $$
begin
  select company_id into new.company_id from jobs where id = new.job_id;
  if new.company_id is null then
    raise exception 'job_id inválido: vaga não encontrada';
  end if;
  return new;
end;
$$;
create trigger trg_candidates_set_company_id
  before insert on candidates
  for each row execute function candidates_set_company_id();

-- ----------------------------------------------------------------------------
-- training_trails / training_items
-- ----------------------------------------------------------------------------
create table training_trails (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  title text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_training_trails_company on training_trails (company_id);

create table training_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  trail_id uuid not null references training_trails (id) on delete cascade,
  title text not null,
  description text,
  content_type text not null,
  url text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  constraint training_items_content_type_check check (content_type in ('YOUTUBE', 'VIMEO', 'LINK'))
);
create index idx_training_items_trail on training_items (trail_id, position);

create or replace function training_items_set_company_id()
returns trigger language plpgsql as $$
begin
  select company_id into new.company_id from training_trails where id = new.trail_id;
  if new.company_id is null then
    raise exception 'trail_id inválido: trilha não encontrada';
  end if;
  return new;
end;
$$;
create trigger trg_training_items_set_company_id
  before insert on training_items
  for each row execute function training_items_set_company_id();

-- ----------------------------------------------------------------------------
-- training_assignments / training_progress
-- ----------------------------------------------------------------------------
create table training_assignments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  trail_id uuid not null references training_trails (id) on delete cascade,
  assigned_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint training_assignments_unique unique (user_id, trail_id)
);
create index idx_training_assignments_company_user on training_assignments (company_id, user_id);
create index idx_training_assignments_trail on training_assignments (trail_id);

create table training_progress (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  assignment_id uuid not null references training_assignments (id) on delete cascade,
  training_item_id uuid not null references training_items (id) on delete cascade,
  completed boolean not null default false,
  completed_at timestamptz,
  constraint training_progress_unique unique (assignment_id, training_item_id)
);
create index idx_training_progress_company_assignment on training_progress (company_id, assignment_id);

-- ----------------------------------------------------------------------------
-- time_clocks (Ponto Lite)
-- recorded_at é SEMPRE now() no servidor — nunca aceito do cliente.
-- A sequência ENTRADA/SAÍDA e a proteção contra corrida são garantidas por
-- uma função SECURITY DEFINER chamada pelo servidor (register_time_clock),
-- que serializa por usuário com pg_advisory_xact_lock antes de decidir o
-- próximo tipo esperado.
-- ----------------------------------------------------------------------------
create table time_clocks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  type text not null,
  recorded_at timestamptz not null default now(),
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  created_at timestamptz not null default now(),
  constraint time_clocks_type_check check (type in ('ENTRADA', 'SAIDA'))
);
create index idx_time_clocks_company_user_date on time_clocks (company_id, user_id, recorded_at desc);

create or replace function register_time_clock(
  p_user_id uuid,
  p_company_id uuid,
  p_latitude numeric default null,
  p_longitude numeric default null
)
returns time_clocks language plpgsql as $$
declare
  v_last_type text;
  v_next_type text;
  v_row time_clocks;
begin
  -- serializa batidas concorrentes do mesmo usuário (protege contra duplo clique / corrida)
  perform pg_advisory_xact_lock(hashtext(p_user_id::text));

  select type into v_last_type
  from time_clocks
  where user_id = p_user_id
    and company_id = p_company_id
    and recorded_at::date = (now() at time zone 'utc')::date
  order by recorded_at desc
  limit 1;

  v_next_type := case when v_last_type = 'ENTRADA' then 'SAIDA' else 'ENTRADA' end;

  insert into time_clocks (company_id, user_id, type, latitude, longitude)
  values (p_company_id, p_user_id, v_next_type, p_latitude, p_longitude)
  returning * into v_row;

  return v_row;
end;
$$ security definer set search_path = public;

-- ----------------------------------------------------------------------------
-- payroll_variables (Folha Lite)
-- ----------------------------------------------------------------------------
create table payroll_variables (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  competence date not null,
  type text not null,
  description text,
  amount numeric(12, 2) not null,
  notes text,
  created_by uuid references users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payroll_variables_type_check check (
    type in ('COMISSAO', 'PREMIO', 'FALTA_JUSTIFICADA', 'FALTA_INJUSTIFICADA', 'OUTROS')
  ),
  constraint payroll_variables_amount_check check (amount >= 0),
  constraint payroll_variables_competence_check check (
    competence = date_trunc('month', competence)::date
  )
);
create index idx_payroll_variables_company_competence on payroll_variables (company_id, competence);
create index idx_payroll_variables_company_user on payroll_variables (company_id, user_id, competence);

-- ----------------------------------------------------------------------------
-- company_options — listas configuráveis pela empresa (Configurações):
-- setor, horário de trabalho, modalidade de contratação.
-- ----------------------------------------------------------------------------
create table company_options (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  category text not null,
  label text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint company_options_category_check
    check (category in ('SETOR', 'HORARIO_TRABALHO', 'MODALIDADE_CONTRATACAO', 'CATEGORIA_BUDGET')),
  constraint company_options_unique unique (company_id, category, label)
);
create index idx_company_options_company_category on company_options (company_id, category);

-- ----------------------------------------------------------------------------
-- budgets / budget_expenses — orçamento por departamento/categoria
-- (Gestão > Budget). "department" é texto livre, mesma convenção de
-- users.department (sem FK pra company_options).
-- ----------------------------------------------------------------------------
-- Orçamento com vigência: entra em vigor em start_date e vale até end_date
-- (ou indefinidamente, se null). status ATIVO/SUSPENSO. Pode existir mais
-- de um registro por departamento/categoria ao longo do tempo.
create table budgets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  department text not null,
  category text not null,
  amount numeric(12, 2) not null,
  start_date date not null,
  end_date date,
  status text not null default 'ATIVO',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint budgets_category_check check (category in ('SALARIO', 'TREINAMENTO', 'CONFRATERNIZACOES')),
  constraint budgets_status_check check (status in ('ATIVO', 'SUSPENSO'))
);
create index idx_budgets_company_department on budgets (company_id, department, category);
create index idx_budgets_company_status on budgets (company_id, status);

create table budget_expenses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  department text not null,
  category text not null,
  description text,
  amount numeric(12, 2) not null,
  expense_date date not null,
  created_at timestamptz not null default now(),
  constraint budget_expenses_category_check check (category in ('SALARIO', 'TREINAMENTO', 'CONFRATERNIZACOES'))
);
create index idx_budget_expenses_company_dept_cat on budget_expenses (company_id, department, category);
create index idx_budget_expenses_company_date on budget_expenses (company_id, expense_date);

-- ----------------------------------------------------------------------------
-- employee_exits — registro de desligamento (Pessoas > Desligamentos),
-- alimenta os KPIs de turnover em Gestão > KPIs. Guarda uma "foto" dos
-- dados do colaborador porque o cadastro pode ser excluído depois.
-- ----------------------------------------------------------------------------
create table employee_exits (
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
create index idx_employee_exits_company_date on employee_exits (company_id, exit_date);

-- ----------------------------------------------------------------------------
-- kanban_stage_labels — título customizado de cada coluna do Kanban de
-- candidatos, por empresa. A chave do estágio (TRIAGE/INTERVIEW/PROPOSAL/
-- HIRED) continua fixa no sistema todo; só o rótulo exibido muda.
-- ----------------------------------------------------------------------------
create table kanban_stage_labels (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  stage text not null,
  label text not null,
  constraint kanban_stage_labels_unique unique (company_id, stage)
);

-- ----------------------------------------------------------------------------
-- updated_at automático
-- ----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['companies','users','jobs','candidates','training_trails','payroll_variables']
  loop
    execute format('create trigger trg_%I_updated_at before update on %I for each row execute function set_updated_at();', t, t);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- Rede de segurança: nega tudo por padrão a anon/authenticated.
-- Todo acesso legítimo passa pelo servidor Next.js com a service_role.
-- ----------------------------------------------------------------------------
alter table companies enable row level security;
alter table users enable row level security;
alter table jobs enable row level security;
alter table candidates enable row level security;
alter table training_trails enable row level security;
alter table training_items enable row level security;
alter table training_assignments enable row level security;
alter table training_progress enable row level security;
alter table time_clocks enable row level security;
alter table payroll_variables enable row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

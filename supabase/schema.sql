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
  -- Força troca de senha no primeiro login pra contas criadas com senha
  -- temporária (inviteUser, createColaborador) — ver migrations/0016.
  must_change_password boolean not null default false,
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
-- candidates — a PESSOA (independente de vaga). Uma pessoa pode ter várias
-- candidaturas (applications) ao longo do tempo, inclusive em vagas
-- diferentes — ver "banco de talentos".
-- ----------------------------------------------------------------------------
create table candidates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  linkedin_url text,
  resume_path text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_candidates_company on candidates (company_id);
create index idx_candidates_company_email on candidates (company_id, email);

-- ----------------------------------------------------------------------------
-- applications — a candidatura de um candidate a UMA vaga específica.
-- company_id é sempre copiado do job no momento do insert (trigger abaixo),
-- nunca aceito do payload do formulário público. Sem check constraint pra
-- stage (padrão mais recente do projeto: validar no Zod).
-- ----------------------------------------------------------------------------
create table applications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  candidate_id uuid not null references candidates (id) on delete cascade,
  job_id uuid not null references jobs (id) on delete cascade,
  stage text not null default 'TRIAGE',
  position integer not null default 0,
  qualification_tag text,
  hired_at timestamptz,
  process_steps jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_applications_company on applications (company_id);
create index idx_applications_job on applications (company_id, job_id);
create index idx_applications_stage on applications (company_id, job_id, stage);
create index idx_applications_candidate on applications (company_id, candidate_id);

create or replace function applications_set_company_id()
returns trigger language plpgsql as $$
begin
  select company_id into new.company_id from jobs where id = new.job_id;
  if new.company_id is null then
    raise exception 'job_id inválido: vaga não encontrada';
  end if;
  return new;
end;
$$;
create trigger trg_applications_set_company_id
  before insert on applications
  for each row execute function applications_set_company_id();
-- trigger de updated_at: ver "updated_at automático" mais abaixo (set_updated_at()
-- só é definida lá — precisa vir depois no script rodado do zero).

-- ----------------------------------------------------------------------------
-- application_events — histórico cronológico de uma candidatura (mudança de
-- etapa, nota, e-mail enviado na Fase 1 etc.).
-- ----------------------------------------------------------------------------
create table application_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  application_id uuid not null references applications (id) on delete cascade,
  type text not null, -- validado no Zod, sem check constraint por ora
  payload jsonb,
  actor_id uuid references users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index idx_application_events_company_application on application_events (company_id, application_id);
create index idx_application_events_company_created_at on application_events (company_id, created_at);

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
    check (category in ('SETOR', 'HORARIO_TRABALHO', 'MODALIDADE_CONTRATACAO')),
  constraint company_options_unique unique (company_id, category, label)
);
create index idx_company_options_company_category on company_options (company_id, category);

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
-- employee_documents — documento anexado à ficha do colaborador (contrato,
-- atestado, exame etc.). file_url guarda o path no Supabase Storage, não o
-- binário — upload real (bucket + action + UI) ainda não implementado.
-- ----------------------------------------------------------------------------
create table employee_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  type text not null, -- validado no Zod, sem check constraint por ora
  file_name text not null,
  file_url text not null,
  issue_date date,
  expiration_date date,
  notes text,
  created_at timestamptz not null default now()
);
create index idx_employee_documents_company_id_user_id on employee_documents (company_id, user_id);
create index idx_employee_documents_company_id_expiration_date on employee_documents (company_id, expiration_date);

-- ----------------------------------------------------------------------------
-- notifications — avisos operacionais da empresa (ex.: candidatura recebida).
-- Lidas via sininho no topo do dashboard.
-- ----------------------------------------------------------------------------
create table notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  type text not null, -- validado no Zod, sem check constraint por ora
  title text not null,
  message text not null,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_notifications_company_id_created_at on notifications (company_id, created_at desc);
create index idx_notifications_company_id_read on notifications (company_id, read);

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
  foreach t in array array['companies','users','jobs','candidates','applications','training_trails']
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

revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

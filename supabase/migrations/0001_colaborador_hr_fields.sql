-- ============================================================================
-- Adiciona a ficha de colaborador (cadastro RH) à tabela users existente.
-- Rode no SQL Editor do projeto Supabase (ou via `npm run db:migrate`).
-- Todas as colunas são opcionais — a obrigatoriedade é validada na aplicação
-- (schemas/colaborador.ts), não no banco.
-- ============================================================================

alter table users
  -- 1. Dados pessoais básicos
  add column if not exists birth_date date,
  add column if not exists sex text,
  add column if not exists nationality text,
  add column if not exists birthplace text,
  add column if not exists marital_status text,
  add column if not exists mother_name text,
  add column if not exists father_name text,
  add column if not exists address_zip text,
  add column if not exists address_street text,
  add column if not exists address_number text,
  add column if not exists address_complement text,
  add column if not exists address_neighborhood text,
  add column if not exists address_city text,
  add column if not exists address_state text,
  add column if not exists phone text,
  add column if not exists education_level text,
  add column if not exists race_color text,
  -- 2. Documentos de identificação
  add column if not exists cpf text,
  add column if not exists id_document_type text,
  add column if not exists id_document_number text,
  add column if not exists ctps_number text,
  add column if not exists pis_number text,
  add column if not exists voter_title_number text,
  add column if not exists reservist_certificate text,
  add column if not exists civil_registry_type text,
  add column if not exists civil_registry_number text,
  -- 3. Dados profissionais e contratuais
  add column if not exists position text,
  add column if not exists admission_date date,
  add column if not exists salary numeric(12, 2),
  add column if not exists work_schedule text,
  add column if not exists registration_number text,
  -- 4. Dados bancários e benefícios
  add column if not exists bank_name text,
  add column if not exists bank_agency text,
  add column if not exists bank_account text,
  add column if not exists transport_voucher_opt_in boolean,
  add column if not exists dependents jsonb,
  -- 5. Saúde ocupacional
  add column if not exists admission_exam_date date,
  add column if not exists admission_exam_result text;

create unique index if not exists users_company_cpf_unique on users (company_id, cpf);

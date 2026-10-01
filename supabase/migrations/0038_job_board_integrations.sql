-- Parametrização — integrações de divulgação de vagas (LinkedIn, Indeed,
-- InfoJobs, Jooble, Google). Tudo opcional/default seguro, não trava nada
-- existente.

-- Dados de integração cadastrados 1x por empresa (Configurações > Parametrização).
alter table public.companies add column if not exists indeed_employer_email text;
alter table public.companies add column if not exists linkedin_company_id text;
-- InfoJobs tratado igual ao LinkedIn (sem API self-service de publicação,
-- confirmado na investigação — precisa de parceria comercial prévia).
alter table public.companies add column if not exists infojobs_id text;

-- Seleção por vaga de onde ela deve ser divulgada — opt-in (default false,
-- recrutador escolhe ativamente em vez de tudo pré-marcado).
alter table public.jobs add column if not exists publish_google boolean not null default false;
alter table public.jobs add column if not exists publish_indeed boolean not null default false;
alter table public.jobs add column if not exists publish_jooble boolean not null default false;
alter table public.jobs add column if not exists publish_linkedin boolean not null default false;
alter table public.jobs add column if not exists publish_infojobs boolean not null default false;

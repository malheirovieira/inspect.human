-- Sprint 1 — Multipostagem de Vagas (SEO estruturado + feeds)
-- Campos novos, todos opcionais/nullable — não trava cadastro existente de
-- empresa nem de vaga.

-- Endereço estruturado da empresa, pra montar o jobLocation.address do
-- JobPosting JSON-LD (hoje só existe location como texto livre na vaga).
alter table public.companies add column if not exists address_street text;
alter table public.companies add column if not exists address_city text;
alter table public.companies add column if not exists address_state text;
alter table public.companies add column if not exists address_zip text;
alter table public.companies add column if not exists address_country text default 'BR';

-- Data de expiração da vaga — Google trata como obrigatório na prática.
-- Configurável por vaga no formulário (sugestão de 30 dias no cliente,
-- não é um default fixo no banco porque depende da data de criação).
alter table public.jobs add column if not exists valid_through timestamptz;

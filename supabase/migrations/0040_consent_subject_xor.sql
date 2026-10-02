-- Fase 2 — generaliza Consent pra aceitar 3 tipos de "sujeito" do
-- consentimento: candidato (como já era), colaborador avulso (user_id), ou
-- vinculado a um desligamento específico (employee_exit_id). Exatamente UM
-- dos três deve estar preenchido — o banco não garante XOR facilmente com
-- CHECK simples por causa de NULLs, então a regra é validada na aplicação
-- (ver lib/consent.ts, usado por qualquer código que crie um Consent).

alter table public.consents alter column candidate_id drop not null;

alter table public.consents add column if not exists user_id uuid references public.users(id) on delete cascade;
alter table public.consents add column if not exists employee_exit_id uuid references public.employee_exits(id) on delete cascade;

create index if not exists idx_consents_company_user_purpose on public.consents (company_id, user_id, purpose);
create index if not exists idx_consents_company_exit_purpose on public.consents (company_id, employee_exit_id, purpose);

-- CHECK best-effort (defesa em profundidade — a validação real é na
-- aplicação): pelo menos um dos três precisa estar preenchido. Não dá pra
-- garantir "exatamente um" só com CHECK sem tornar a constraint muito
-- frágil a NULLs, então isso só barra o caso óbvio de nenhum preenchido.
alter table public.consents add constraint consents_has_subject
  check (candidate_id is not null or user_id is not null or employee_exit_id is not null);

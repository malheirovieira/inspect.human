-- SUPERADMIN é dono do sistema, não de uma empresa — antes disso não havia
-- como um usuário existir sem company_id (NOT NULL + ON DELETE CASCADE),
-- então promover alguém a SUPERADMIN o deixava preso à empresa de origem.

alter table public.users alter column company_id drop not null;

-- Sem CASCADE aqui: se a empresa de origem de um SUPERADMIN for removida,
-- ele deve continuar existindo (companyId cai pra null), não ser apagado junto.
alter table public.users drop constraint if exists users_company_id_fkey;
alter table public.users
  add constraint users_company_id_fkey
  foreign key (company_id) references public.companies(id)
  on delete set null;

-- Desvincula qualquer SUPERADMIN já existente da empresa que carregava.
update public.users set company_id = null where role = 'SUPERADMIN';

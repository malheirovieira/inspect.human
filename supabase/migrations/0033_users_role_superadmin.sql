-- Adiciona SUPERADMIN (dono do sistema, gerencia /admin/parceiros) aos
-- valores permitidos de users.role — antes só ADMIN/HR/EMPLOYEE.
alter table public.users drop constraint if exists users_role_check;
alter table public.users add constraint users_role_check check (role in ('ADMIN', 'HR', 'EMPLOYEE', 'SUPERADMIN'));

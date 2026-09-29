import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "./supabase/server";
import { prisma } from "./prisma";

// SUPERADMIN é dono do sistema, DE FATO fora de qualquer empresa —
// companyId é null pra essa role (migration 0034), nunca reaproveita a
// empresa de origem de antes da promoção. Só gerencia /admin/*.
export type Role = "ADMIN" | "HR" | "EMPLOYEE" | "SUPERADMIN";

export type Session = {
  userId: string;
  companyId: string | null;
  role: Role;
  name: string;
  email: string;
  mustChangePassword: boolean;
};

// Única fonte de {userId, companyId, role} usada pelo resto da aplicação.
// Nunca aceitar esses valores vindos de formulário/query string/body.
//
// cache() memoiza por requisição: layout + page + cada service que chama
// requireSession/requireRole na mesma renderização reusam o mesmo resultado
// em vez de bater no Supabase Auth + Prisma de novo a cada chamada — é isso
// que fazia telas como /colaboradores/novo (layout + requireRole + 2x
// listCompanyOptions) rodarem a validação de sessão 4 vezes numa página só.
export const getSession = cache(async (): Promise<Session | null> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser || !dbUser.active) return null;

  return {
    userId: dbUser.id,
    companyId: dbUser.companyId,
    role: dbUser.role as Role,
    name: dbUser.name,
    email: dbUser.email,
    mustChangePassword: dbUser.mustChangePassword,
  };
});

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

// Duas assinaturas: quando `roles` não inclui "SUPERADMIN" (toda página de
// negócio existente — ADMIN/HR/EMPLOYEE), o retorno GARANTE companyId como
// string, sem precisar tocar nos ~50 call sites que já existiam antes do
// companyId virar opcional (nenhum deles listava "SUPERADMIN" nos roles
// aceitos, então a inferência do array literal já casa com este overload
// automaticamente). Quando `roles` inclui "SUPERADMIN" (páginas /admin/*),
// o retorno é a Session crua (companyId pode ser null de verdade).
export async function requireRole(roles: Exclude<Role, "SUPERADMIN">[]): Promise<Session & { companyId: string }>;
export async function requireRole(roles: Role[]): Promise<Session>;
export async function requireRole(roles: Role[]): Promise<Session> {
  const session = await requireSession();

  if (session.role === "SUPERADMIN") {
    // Página já é pra SUPERADMIN (ex.: /admin/parceiros, /admin/empresas) —
    // não exige companyId, que SUPERADMIN não tem.
    if (roles.includes("SUPERADMIN")) return session;
    // Página de negócio (ADMIN/HR/EMPLOYEE): sem empresa vinculada não há o
    // que filtrar — manda pro painel dele em vez de vazar companyId null
    // pras queries dessa página.
    if (!session.companyId) redirect("/admin/empresas");
    return session;
  }

  if (!roles.includes(session.role)) redirect("/dashboard");
  return session;
}

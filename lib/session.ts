import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "./supabase/server";
import { prisma } from "./prisma";

export type Role = "ADMIN" | "HR" | "EMPLOYEE";

export type Session = {
  userId: string;
  companyId: string;
  role: Role;
  name: string;
  email: string;
};

// Única fonte de {userId, companyId, role} usada pelo resto da aplicação.
// Nunca aceitar esses valores vindos de formulário/query string/body.
export async function getSession(): Promise<Session | null> {
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
  };
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireRole(roles: Role[]): Promise<Session> {
  const session = await requireSession();
  if (!roles.includes(session.role)) redirect("/dashboard");
  return session;
}

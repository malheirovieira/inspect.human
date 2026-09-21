import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7 exige um driver adapter explícito em runtime (não lê mais
// DATABASE_URL implicitamente do schema). Usamos o transaction pooler do
// Supabase aqui — a conexão direta (IPv6) não é alcançável desta rede, e em
// produção (Vercel, serverless) o pooler é o recomendado de qualquer forma.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

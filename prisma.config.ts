import { defineConfig, env } from "prisma/config";
import { config as loadEnv } from "dotenv";

// A CLI da Prisma não lê .env.local automaticamente (isso é convenção do
// Next.js). Carregamos aqui para os comandos `prisma db execute/pull/generate`
// enxergarem DATABASE_URL/DIRECT_URL.
loadEnv({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  // A CLI (db pull/migrate/studio) usa o session pooler (porta 5432), que
  // suporta prepared statements/DDL. O app em runtime usa o transaction
  // pooler (DATABASE_URL, porta 6543) via driver adapter em lib/prisma.ts.
  datasource: {
    url: env("DIRECT_URL"),
  },
});

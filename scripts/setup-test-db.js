// Prepara o projeto Supabase de TESTE pra `npm run test:db`.
// - Banco vazio: roda supabase/schema.sql inteiro (valida de quebra que o
//   schema "do zero" continua aplicável).
// - Schema já aplicado: roda só as migrations que faltam (MIGRATIONS abaixo —
//   acrescentar aqui cada migration nova que os testes usam).
// Usa TEST_DIRECT_URL (session pooler, porta 5432 — DDL), nunca DATABASE_URL.
//
//   npm run test:db:setup
const { readFileSync } = require("node:fs");
const { Client } = require("pg");
require("dotenv").config({ path: ".env.local", quiet: true });

const url = process.env.TEST_DIRECT_URL;
if (!url) {
  console.error("Defina TEST_DIRECT_URL no .env.local (session pooler do projeto de TESTE).");
  process.exit(1);
}

function projectKey(u) {
  const parsed = new URL(u);
  return `${decodeURIComponent(parsed.username)}@${parsed.hostname}`;
}
for (const prodVar of ["DATABASE_URL", "DIRECT_URL"]) {
  const prod = process.env[prodVar];
  if (prod && projectKey(prod) === projectKey(url)) {
    console.error(`TEST_DIRECT_URL aponta pro mesmo projeto de ${prodVar} — abortando.`);
    process.exit(1);
  }
}

// [o que a migration cria — "schema.tabela" ou "schema.tabela.coluna", arquivo] — em ordem.
const MIGRATIONS = [
  ["public.background_tasks", "supabase/migrations/0021_background_tasks.sql"],
  ["public.candidate_resumes", "supabase/migrations/0022_resume_versions_consents_ai.sql"],
  ["public.companies.plan", "supabase/migrations/0023_company_plan.sql"],
];

async function tableExists(client, name) {
  const parts = name.split(".");
  if (parts.length === 3) {
    const { rows } = await client.query(
      "select exists (select 1 from information_schema.columns where table_schema = $1 and table_name = $2 and column_name = $3) as ok",
      parts
    );
    return rows[0].ok;
  }
  const { rows } = await client.query("select to_regclass($1) is not null as ok", [name]);
  return rows[0].ok;
}

(async () => {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    if (!(await tableExists(client, "public.companies"))) {
      console.log("Banco vazio — aplicando supabase/schema.sql...");
      await client.query(readFileSync("supabase/schema.sql", "utf8"));
      console.log("OK.");
      return;
    }

    let applied = 0;
    for (const [table, file] of MIGRATIONS) {
      if (await tableExists(client, table)) continue;
      console.log(`Aplicando ${file}...`);
      await client.query(readFileSync(file, "utf8"));
      applied++;
    }
    console.log(applied === 0 ? "Projeto de teste já está atualizado." : "OK.");
  } finally {
    await client.end();
  }
})().catch((err) => {
  console.error(err.message);
  if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|Tenant or user not found/i.test(err.message)) {
    console.error("O projeto de teste pode estar PAUSADO por inatividade — reative no painel do Supabase.");
  }
  process.exit(1);
});

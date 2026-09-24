// Backfill do versionamento de currículo (migration 0022).
//
// Pra cada candidato com o arquivo LEGADO (candidates.resume_path) e sem
// versão (current_resume_id null): baixa o PDF, calcula o SHA-256, copia pro
// caminho novo (empresa/pessoa/<sha256>.pdf), cria a linha em
// candidate_resumes (source LEGACY) e aponta current_resume_id pra ela.
//
// - Por padrão só SIMULA (nada é gravado). Pra gravar: --apply
// - Idempotente: rodar de novo pula quem já tem versão.
// - NÃO apaga o arquivo legado nem a coluna resume_path — isso é a migration
//   0023, depois de conferir o resultado daqui.
// - applications.resume_id fica null nas candidaturas antigas: o arquivo
//   legado era sobrescrito a cada upload, então não dá pra saber qual versão
//   foi enviada com cada uma.
//
//   node scripts/backfill-resume-versions.js           # simulação
//   node scripts/backfill-resume-versions.js --apply   # grava
const path = require("path");
const { createHash } = require("crypto");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local"), quiet: true });
const { Client } = require("pg");
const { createClient } = require("@supabase/supabase-js");

const APPLY = process.argv.includes("--apply");
const BUCKET = "resumes";

// Mesmas regras de lib/resumes/files.ts (script JS puro não importa o TS).
const isPdf = (buf) => buf.subarray(0, 5).toString("latin1") === "%PDF-";
const sha256Hex = (buf) => createHash("sha256").update(buf).digest("hex");
const storagePathFor = (companyId, candidateId, sha) => `${companyId}/${candidateId}/${sha}.pdf`;

(async () => {
  for (const v of ["DIRECT_URL", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
    if (!process.env[v]) {
      console.error(`Defina ${v} no .env.local.`);
      process.exit(1);
    }
  }

  const db = new Client({ connectionString: process.env.DIRECT_URL });
  await db.connect();
  const storage = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  }).storage.from(BUCKET);

  const { rows } = await db.query(
    `select id, company_id, resume_path, updated_at
     from public.candidates
     where resume_path is not null and current_resume_id is null
     order by created_at`
  );
  console.log(`${rows.length} candidato(s) com currículo legado sem versão.${APPLY ? "" : " (SIMULAÇÃO — use --apply pra gravar)"}`);

  const result = { migrated: 0, notFound: 0, notPdf: 0, failed: 0 };

  for (const c of rows) {
    // Só ids nos logs — nada de nome/e-mail.
    const tag = `candidato ${c.id}`;
    try {
      const { data: blob, error: downloadError } = await storage.download(c.resume_path);
      if (downloadError || !blob) {
        console.warn(`- ${tag}: arquivo legado não encontrado no Storage (${c.resume_path}) — pulado`);
        result.notFound++;
        continue;
      }
      const buf = Buffer.from(await blob.arrayBuffer());
      if (!isPdf(buf)) {
        console.warn(`- ${tag}: arquivo legado não é PDF válido — pulado`);
        result.notPdf++;
        continue;
      }

      const sha = sha256Hex(buf);
      const newPath = storagePathFor(c.company_id, c.id, sha);
      if (!APPLY) {
        console.log(`- ${tag}: ${c.resume_path} → ${newPath}`);
        result.migrated++;
        continue;
      }

      const { error: uploadError } = await storage.upload(newPath, buf, { contentType: "application/pdf", upsert: false });
      if (uploadError && !(String(uploadError.statusCode) === "409" || /already exists/i.test(uploadError.message))) {
        throw new Error(`upload: ${uploadError.message}`);
      }

      await db.query("begin");
      try {
        await db.query(
          `insert into public.candidate_resumes
             (company_id, candidate_id, storage_path, sha256, size_bytes, source, created_at)
           values ($1, $2, $3, $4, $5, 'LEGACY', $6)
           on conflict (candidate_id, sha256) do nothing`,
          [c.company_id, c.id, newPath, sha, buf.length, c.updated_at]
        );
        const { rows: r } = await db.query(
          "select id from public.candidate_resumes where candidate_id = $1 and sha256 = $2",
          [c.id, sha]
        );
        await db.query(
          "update public.candidates set current_resume_id = $1 where id = $2 and current_resume_id is null",
          [r[0].id, c.id]
        );
        await db.query("commit");
      } catch (err) {
        await db.query("rollback");
        throw err;
      }
      console.log(`- ${tag}: migrado`);
      result.migrated++;
    } catch (err) {
      console.error(`- ${tag}: FALHOU — ${err.message}`);
      result.failed++;
    }
  }

  await db.end();
  console.log(
    `\n${APPLY ? "Migrados" : "Seriam migrados"}: ${result.migrated} · arquivo ausente: ${result.notFound} · não-PDF: ${result.notPdf} · falhas: ${result.failed}`
  );
  if (result.failed > 0) process.exit(1);
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { purgeSupersededResumes } from "@/lib/resumes/purge";
import { RESUME_BUCKET } from "@/lib/resumes/files";
import { defineTask } from "../registry";

// Retenção de versões substituídas de currículo — enfileirada 1x por dia
// pelo pg_cron (supabase/cron/process_tasks.sql). Tarefa de sistema
// (company_id null).
export const resumePurgeVersionsTask = defineTask({
  type: "resume.purge_versions",
  payloadSchema: z.object({}),
  handler: async () => {
    await purgeSupersededResumes({
      db: prisma,
      async removeFiles(paths) {
        const { error } = await createSupabaseAdminClient().storage.from(RESUME_BUCKET).remove(paths);
        if (error) throw new Error(`Falha ao remover arquivos do Storage: ${error.message}`);
      },
    });
  },
});

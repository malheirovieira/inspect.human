import "server-only";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolveCompanyAiConfig } from "@/lib/ai/resolveConfig";
import { analyzeResume } from "@/lib/screening/analyzeResume";
import { RESUME_ANALYZE_TASK, resumeAnalyzePayloadSchema } from "@/lib/screening/request";
import { RESUME_BUCKET } from "@/lib/resumes/files";
import { defineTask } from "../registry";

// Triagem com IA de uma versão de currículo. Regras em
// lib/screening/analyzeResume.ts; aqui só as dependências reais.
// resolveConfig: BYOK da empresa (Fase 1) com fallback pra config da
// plataforma — analyzeResume chama isso só depois de saber o companyId.
export const resumeAnalyzeTask = defineTask({
  type: RESUME_ANALYZE_TASK,
  payloadSchema: resumeAnalyzePayloadSchema,
  handler: async ({ analysisId }, ctx) => {
    await analyzeResume(
      {
        db: prisma,
        resolveConfig: resolveCompanyAiConfig,
        async downloadResume(storagePath) {
          const { data, error } = await createSupabaseAdminClient().storage.from(RESUME_BUCKET).download(storagePath);
          if (error || !data) throw new Error(`Falha ao baixar currículo do Storage: ${error?.message ?? "vazio"}`);
          return new Uint8Array(await data.arrayBuffer());
        },
      },
      analysisId,
      ctx
    );
  },
});

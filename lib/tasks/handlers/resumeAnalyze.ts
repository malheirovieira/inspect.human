import "server-only";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAiConfig } from "@/lib/ai";
import { createAiProvider } from "@/lib/ai/providers";
import { analyzeResume } from "@/lib/screening/analyzeResume";
import { RESUME_ANALYZE_TASK, resumeAnalyzePayloadSchema } from "@/lib/screening/request";
import { RESUME_BUCKET } from "@/lib/resumes/files";
import { defineTask } from "../registry";

// Triagem com IA de uma versão de currículo. Regras em
// lib/screening/analyzeResume.ts; aqui só as dependências reais.
export const resumeAnalyzeTask = defineTask({
  type: RESUME_ANALYZE_TASK,
  payloadSchema: resumeAnalyzePayloadSchema,
  handler: async ({ analysisId }, ctx) => {
    const config = getAiConfig();
    await analyzeResume(
      {
        db: prisma,
        config,
        provider: createAiProvider(config),
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

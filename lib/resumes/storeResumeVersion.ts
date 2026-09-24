import "server-only";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAiConfig } from "@/lib/ai";
import { taskRegistry } from "@/lib/tasks";
import { requestResumeAnalysis } from "@/lib/screening/request";
import { RESUME_BUCKET } from "./files";
import {
  storeResumeVersionWith,
  type ResumeSource,
  type ResumeStorage,
  type StoreResumeResult,
} from "./versioning";

// Storage real: bucket privado `resumes`, sem upsert.
const supabaseResumeStorage: ResumeStorage = {
  async uploadIfAbsent(path, data) {
    const { error } = await createSupabaseAdminClient()
      .storage.from(RESUME_BUCKET)
      .upload(path, data, { contentType: "application/pdf", upsert: false });
    if (!error) return { error: null };
    // "Já existe" = mesmo conteúdo (o caminho é o hash) — ex.: sobra de uma
    // transação que falhou, ou dois envios simultâneos do mesmo arquivo.
    const status = String((error as { statusCode?: unknown }).statusCode ?? "");
    if (status === "409" || /already exists/i.test(error.message)) return { error: null };
    return { error: error.message };
  },
};

// ÚNICO caminho de gravação de currículo no app (formulário público e upload
// do recrutador). Regras em lib/resumes/versioning.ts. Versão nova já sai
// com a triagem com IA enfileirada (se a regra de disponibilidade permitir)
// — na mesma transação, nunca processada dentro do request.
export async function storeResumeVersion(input: {
  companyId: string;
  candidateId: string;
  file: File;
  source: ResumeSource;
  uploadedById: string | null;
  applicationId?: string;
}): Promise<StoreResumeResult> {
  const { file, ...rest } = input;
  const data = Buffer.from(await file.arrayBuffer());
  const { allowRealData } = getAiConfig();
  return storeResumeVersionWith(prisma, supabaseResumeStorage, {
    ...rest,
    data,
    onNewVersion: async (tx, { resumeId }) => {
      await requestResumeAnalysis(tx, taskRegistry, { companyId: input.companyId, resumeId, allowRealData });
    },
  });
}

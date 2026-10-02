import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveCompanyAiConfig } from "@/lib/ai/resolveConfig";
import { createAiProvider } from "@/lib/ai/providers";
import { EXIT_SURVEY_AI_ANALYSIS_CONSENT_PURPOSE } from "@/lib/ai/availability";
import { MIN_THEME_RESPONSES, THEME_JSON_SCHEMA, THEME_SYSTEM_PROMPT, buildThemeInput, parseThemeOutput } from "@/lib/exitSurvey/themeAnalysis";
import { PermanentTaskError, TransientTaskError } from "../errors";
import { isLastAttempt } from "../registry";
import { defineTask } from "../registry";

export const EXIT_THEME_ANALYZE_TASK = "exitSurvey.themeAnalyze";
export const exitThemeAnalyzePayloadSchema = z.object({ reportId: z.string().uuid() });

// Mesmo padrão de lib/screening/analyzeResume.ts: dependências resolvidas
// aqui dentro (não antes de enfileirar), config/consentimento conferidos DE
// NOVO no processamento (podem ter mudado enquanto a tarefa esperava).
export const exitThemeAnalyzeTask = defineTask({
  type: EXIT_THEME_ANALYZE_TASK,
  payloadSchema: exitThemeAnalyzePayloadSchema,
  handler: async ({ reportId }, ctx) => {
    const report = await prisma.exitAnalysisReport.findUnique({ where: { id: reportId } });
    if (!report || report.themeStatus !== "PENDING") return;

    const eligible = await prisma.exitSurveyResponse.findMany({
      where: {
        companyId: report.companyId,
        submittedAt: { gte: report.periodFrom, lte: report.periodTo },
        freeComment: { not: null },
        consent: { purpose: EXIT_SURVEY_AI_ANALYSIS_CONSENT_PURPOSE, revokedAt: null },
      },
      select: { freeComment: true },
    });
    const comments = eligible.map((r) => r.freeComment).filter((c): c is string => Boolean(c));

    if (comments.length < MIN_THEME_RESPONSES) {
      await prisma.exitAnalysisReport.update({
        where: { id: reportId },
        data: { themeStatus: "INSUFFICIENT_DATA", themeResponsesAnalyzed: comments.length, themeCompletedAt: new Date() },
      });
      return;
    }

    const config = await resolveCompanyAiConfig(report.companyId);
    if (config.error || !config.allowRealData) {
      await prisma.exitAnalysisReport.update({
        where: { id: reportId },
        data: { themeStatus: "FAILED", themeErrorCode: "CONFIG", themeCompletedAt: new Date() },
      });
      throw new PermanentTaskError(`Configuração de IA inválida: ${config.error ?? "dados reais bloqueados"}`);
    }
    const provider = createAiProvider(config);
    if (!provider) {
      await prisma.exitAnalysisReport.update({
        where: { id: reportId },
        data: { themeStatus: "FAILED", themeErrorCode: "CONFIG", themeCompletedAt: new Date() },
      });
      throw new PermanentTaskError("Nenhum provedor de IA disponível");
    }

    let raw: string;
    try {
      raw = await provider.generate({
        system: THEME_SYSTEM_PROMPT,
        input: buildThemeInput(comments),
        schemaName: "temas_pesquisa_saida",
        jsonSchema: THEME_JSON_SCHEMA,
      });
    } catch (err) {
      if (err instanceof TransientTaskError) throw err;
      if (err instanceof PermanentTaskError || isLastAttempt(ctx)) {
        await prisma.exitAnalysisReport.update({
          where: { id: reportId },
          data: { themeStatus: "FAILED", themeErrorCode: "PROVIDER", themeCompletedAt: new Date() },
        });
      }
      throw err;
    }

    const outcome = parseThemeOutput(raw);
    if (!outcome.ok) {
      await prisma.exitAnalysisReport.update({
        where: { id: reportId },
        data: { themeStatus: "FAILED", themeErrorCode: "INVALID_OUTPUT", themeCompletedAt: new Date() },
      });
      throw new PermanentTaskError(`Resposta da IA rejeitada: ${outcome.reason}`);
    }

    await prisma.exitAnalysisReport.update({
      where: { id: reportId },
      data: {
        themeStatus: "DONE",
        themeResult: outcome.data,
        themeResponsesAnalyzed: comments.length,
        themeProvider: provider.name,
        themeModel: provider.model,
        themeIsMock: provider.isMock,
        themeCompletedAt: new Date(),
      },
    });
  },
});

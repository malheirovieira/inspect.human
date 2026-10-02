"use server";

import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { assertConsentSubject, InvalidConsentSubjectError } from "@/lib/consent";
import { EXIT_SURVEY_AI_ANALYSIS_CONSENT_PURPOSE } from "@/lib/ai/availability";

export type ExitSurveyAnswers = {
  leaderName: string;
  environmentScore: number;
  leaderRelationshipScore: number;
  growthScore: number;
  benefitsScore: number;
  communicationScore: number;
  biggestChallenge: string;
  improvementSuggestion: string;
  wouldReturn: boolean;
  wouldRecommend: boolean;
  freeComment: string;
  // Consentimento pra análise por IA do comentário livre (Fase 5) — opcional:
  // dá pra responder a pesquisa sem autorizar a análise por IA.
  consentGiven: boolean;
};

// Texto exigido pela Fase 2 (Consent.textVersion/textHash) — snapshot do que
// foi mostrado ao respondente. Versão simples, sem i18n/variações por ora.
const CONSENT_TEXT_VERSION = "exit-survey-ai-v1";
const CONSENT_TEXT =
  "Autorizo que o comentário livre desta pesquisa seja analisado por inteligência artificial " +
  "para identificar temas recorrentes, sem meu nome associado ao resultado da análise.";

type SubmitResult = { success: false; error: string } | { success: true };

function isValidScore(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5;
}

// Rota pública (quem respondeu o desligamento não tem login) — mesmo padrão
// de segurança de submitDiscAssessment.ts: tudo validado de novo no
// servidor, nada do cliente confiado além de "isto foi preenchido assim".
export async function submitExitSurvey(token: string, answers: ExitSurveyAnswers): Promise<SubmitResult> {
  if (!token) return { success: false, error: "Token inválido" };

  try {
    const response = await prisma.exitSurveyResponse.findUnique({ where: { token } });
    if (!response) return { success: false, error: "Link não encontrado" };
    if (response.submittedAt) return { success: false, error: "Esta pesquisa já foi respondida" };
    if (response.expiresAt < new Date()) return { success: false, error: "Link expirado" };

    const leaderName = answers.leaderName?.trim();
    if (!leaderName) return { success: false, error: "Informe o nome do líder" };

    const scores = {
      environmentScore: answers.environmentScore,
      leaderRelationshipScore: answers.leaderRelationshipScore,
      growthScore: answers.growthScore,
      benefitsScore: answers.benefitsScore,
      communicationScore: answers.communicationScore,
    };
    for (const [field, value] of Object.entries(scores)) {
      if (!isValidScore(value)) return { success: false, error: `Nota inválida em "${field}" — use de 1 a 5` };
    }

    if (typeof answers.wouldReturn !== "boolean" || typeof answers.wouldRecommend !== "boolean") {
      return { success: false, error: "Responda todas as perguntas de sim/não" };
    }

    await prisma.$transaction(async (tx) => {
      let consentId: string | null = null;

      if (answers.consentGiven) {
        assertConsentSubject({ employeeExitId: response.employeeExitId });
        const consent = await tx.consent.create({
          data: {
            companyId: response.companyId,
            employeeExitId: response.employeeExitId,
            purpose: EXIT_SURVEY_AI_ANALYSIS_CONSENT_PURPOSE,
            textVersion: CONSENT_TEXT_VERSION,
            textHash: createHash("sha256").update(CONSENT_TEXT).digest("hex"),
            source: "PUBLIC_FORM",
          },
        });
        consentId = consent.id;
      }

      await tx.exitSurveyResponse.update({
        where: { id: response.id },
        data: {
          submittedAt: new Date(),
          leaderName,
          ...scores,
          biggestChallenge: answers.biggestChallenge?.trim() || null,
          improvementSuggestion: answers.improvementSuggestion?.trim() || null,
          wouldReturn: answers.wouldReturn,
          wouldRecommend: answers.wouldRecommend,
          freeComment: answers.freeComment?.trim() || null,
          consentId,
        },
      });
    });

    return { success: true };
  } catch (err) {
    if (err instanceof InvalidConsentSubjectError) {
      console.error("[submitExitSurvey] consentimento inválido", err);
      return { success: false, error: "Erro interno ao registrar consentimento" };
    }
    console.error("[submitExitSurvey]", err);
    return { success: false, error: "Erro interno do servidor" };
  }
}

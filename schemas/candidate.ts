import { z } from "zod";

export const CANDIDATE_STAGES = ["TRIAGE", "INTERVIEW", "TEST", "PROPOSAL", "HIRED", "REJECTED"] as const;

export const STAGE_LABELS: Record<(typeof CANDIDATE_STAGES)[number], string> = {
  TRIAGE: "Triagem",
  TEST: "Teste",
  INTERVIEW: "Entrevista",
  PROPOSAL: "Proposta",
  HIRED: "Contratado",
  REJECTED: "Reprovado",
};

// Tipo estável da etapa — automações (Fase 1: gatilho de e-mail, e o que
// vier depois) disparam por ISSO, nunca pelo nome da etapa (STAGE_LABELS é
// customizável por empresa via KanbanStageLabel; STAGE_TYPES não é —
// fica fixo no código, amarrado à chave interna do stage).
export const STAGE_TYPES: Record<(typeof CANDIDATE_STAGES)[number], string> = {
  TRIAGE: "SCREENING",
  TEST: "TEST",
  INTERVIEW: "INTERVIEW",
  PROPOSAL: "OFFER",
  HIRED: "HIRED",
  REJECTED: "REJECTED",
};

// Etapas que encerram o pipeline — não contam como "em processo" nem como
// concentração/gargalo (ver app/(dashboard)/recrutamento/page.tsx).
export const TERMINAL_STAGES = ["HIRED", "REJECTED"] as const;

// Sequência do checklist da candidatura — mesma lista e mesma ordem do
// Kanban, MENOS "Reprovado" (não é uma etapa sequencial: é uma saída do
// pipeline, tratada à parte como aviso "Reprovado em [etapa]"). Única fonte
// de verdade é Application.stage — não existe armazenamento próprio de
// "concluído" por etapa (ver CandidateProcessChecklist).
export const PIPELINE_STAGES = CANDIDATE_STAGES.filter((stage) => stage !== "REJECTED");

// Tag manual de qualificação do candidato — independente da etapa do
// pipeline. Sinaliza rapidamente pra quem está triando o que fazer a seguir.
// Marcar RED move a candidatura direto pra REJECTED (ver ApplicationHeader)
// — o gatilho é pelo valor do enum, não pelo label, então o rename aqui não
// mexe nesse comportamento.
export const CANDIDATE_TAGS = ["GREEN", "BLUE", "RED"] as const;

export const TAG_LABELS: Record<(typeof CANDIDATE_TAGS)[number], string> = {
  GREEN: "Perfil compatível",
  BLUE: "Banco de talentos",
  RED: "Perfil incompatível",
};

// Tons vivos/saturados de propósito — precisam se destacar como um alerta
// visual rápido, diferente do resto da paleta (mais neutra) do produto.
export const TAG_COLORS: Record<(typeof CANDIDATE_TAGS)[number], string> = {
  GREEN: "#16A34A",
  BLUE: "#2563EB",
  RED: "#DC2626",
};

export const TAG_NEXT_STEP: Record<(typeof CANDIDATE_TAGS)[number], string> = {
  GREEN: "Avançar de fase e agendar entrevista.",
  BLUE: "Salvar para outras vagas ou posições similares.",
  RED: "Desclassificar do processo e enviar feedback.",
};

export const applyToJobSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido"),
  // Dígitos apenas (a máscara é só de exibição, ver lib/phoneMask.ts) — 10
  // (fixo) ou 11 (celular com o 9º dígito).
  phone: z.string().min(10, "Telefone é obrigatório").max(11, "Telefone inválido"),
  linkedinUrl: z.string().optional(),
});

export type ApplyToJobInput = z.infer<typeof applyToJobSchema>;

export const updateCandidateDadosSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido"),
  phone: z.string().optional(),
  linkedinUrl: z.string().optional(),
});

export type UpdateCandidateDadosInput = z.infer<typeof updateCandidateDadosSchema>;

// Cadastro manual (RH adiciona um candidato direto, sem passar pelo link
// público de candidatura) — precisa escolher a vaga.
export const createCandidateManualSchema = z.object({
  jobId: z.string().min(1, "Selecione a vaga"),
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido"),
  phone: z.string().optional(),
  linkedinUrl: z.string().optional(),
});

export type CreateCandidateManualInput = z.infer<typeof createCandidateManualSchema>;

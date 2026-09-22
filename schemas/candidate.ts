import { z } from "zod";

export const CANDIDATE_STAGES = ["TRIAGE", "INTERVIEW", "PROPOSAL", "HIRED"] as const;

export const STAGE_LABELS: Record<(typeof CANDIDATE_STAGES)[number], string> = {
  TRIAGE: "Triagem",
  INTERVIEW: "Entrevista",
  PROPOSAL: "Proposta",
  HIRED: "Contratado",
};

// Tag manual de qualificação do candidato — independente da etapa do
// pipeline. Sinaliza rapidamente pra quem está triando o que fazer a seguir.
export const CANDIDATE_TAGS = ["GREEN", "YELLOW", "BLUE", "RED", "GRAY"] as const;

export const TAG_LABELS: Record<(typeof CANDIDATE_TAGS)[number], string> = {
  GREEN: "Aprovado / Perfil Ideal",
  YELLOW: "Em avaliação / Em dúvida",
  BLUE: "Banco de Talentos / Futuro",
  RED: "Reprovado / Sem Fit",
  GRAY: "Duplicado ou Incompleto",
};

// Tons vivos/saturados de propósito — precisam se destacar como um alerta
// visual rápido, diferente do resto da paleta (mais neutra) do produto.
export const TAG_COLORS: Record<(typeof CANDIDATE_TAGS)[number], string> = {
  GREEN: "#16A34A",
  YELLOW: "#F59E0B",
  BLUE: "#2563EB",
  RED: "#DC2626",
  GRAY: "#6B7280",
};

export const TAG_NEXT_STEP: Record<(typeof CANDIDATE_TAGS)[number], string> = {
  GREEN: "Avançar de fase e agendar entrevista.",
  YELLOW: "Realizar triagem por telefone ou teste curto.",
  BLUE: "Salvar para outras vagas ou posições similares.",
  RED: "Desclassificar do processo e enviar feedback.",
  GRAY: "Arquivar ou solicitar correção de dados.",
};

// Linha do tempo granular do processo (aba Processo) — marcos fixos na
// ordem em que normalmente acontecem. Independente do "stage" grosso usado
// no Kanban/lista.
export const PROCESS_STEPS = [
  "TRIAGEM_CURRICULO",
  "ENTREVISTA_RECRUTAMENTO",
  "ENTREVISTA_GESTAO",
  "AVALIACAO",
  "CONTRATADO",
  "ENVIO_DOCUMENTOS",
] as const;

export const PROCESS_STEP_LABELS: Record<(typeof PROCESS_STEPS)[number], string> = {
  TRIAGEM_CURRICULO: "Triagem de currículo",
  ENTREVISTA_RECRUTAMENTO: "Entrevista com recrutamento",
  ENTREVISTA_GESTAO: "Entrevista com gestão",
  AVALIACAO: "Avaliação",
  CONTRATADO: "Contratado",
  ENVIO_DOCUMENTOS: "Envio dos documentos",
};

// Mapa etapa -> data de conclusão (ISO) ou null se ainda não aconteceu.
export type ProcessTimeline = Partial<Record<(typeof PROCESS_STEPS)[number], string | null>>;

export const applyToJobSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido"),
  phone: z.string().min(14, "Telefone é obrigatório"),
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

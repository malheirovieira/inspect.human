import { z } from "zod";

export const EXIT_TYPES = ["VOLUNTARIA", "INVOLUNTARIA"] as const;

export const EXIT_TYPE_LABELS: Record<(typeof EXIT_TYPES)[number], string> = {
  VOLUNTARIA: "Voluntária",
  INVOLUNTARIA: "Involuntária",
};

export const EXIT_REASONS = [
  "PEDIU_DEMISSAO",
  "SEM_JUSTA_CAUSA",
  "JUSTA_CAUSA",
  "FIM_DE_CONTRATO",
  "APOSENTADORIA",
  "OUTRO",
] as const;

export const EXIT_REASON_LABELS: Record<(typeof EXIT_REASONS)[number], string> = {
  PEDIU_DEMISSAO: "Pediu demissão",
  SEM_JUSTA_CAUSA: "Demissão sem justa causa",
  JUSTA_CAUSA: "Demissão por justa causa",
  FIM_DE_CONTRATO: "Fim de contrato",
  APOSENTADORIA: "Aposentadoria",
  OUTRO: "Outro",
};

export const createEmployeeExitSchema = z.object({
  userId: z.string().min(1, "Selecione o colaborador"),
  exitDate: z.string().min(1, "Data de saída é obrigatória"),
  exitType: z.enum(EXIT_TYPES),
  reason: z.enum(EXIT_REASONS),
  notes: z.string().optional(),
  rehireEligible: z.boolean(),
});

export type CreateEmployeeExitInput = z.infer<typeof createEmployeeExitSchema>;

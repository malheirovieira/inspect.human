import { z } from "zod";

export const WORK_MODES = ["PRESENCIAL", "REMOTO", "HIBRIDO"] as const;
export const JOB_STATUSES = ["DRAFT", "OPEN", "CLOSED"] as const;

export const jobSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().min(1, "Descrição é obrigatória"),
  department: z.string().optional(),
  location: z.string().optional(),
  workMode: z.enum(WORK_MODES),
  employmentType: z.string().optional(),
  // Cronograma planejado — todos opcionais, "YYYY-MM-DD".
  resumeDeadline: z.string().optional(),
  interviewDeadline: z.string().optional(),
  hiringDeadline: z.string().optional(),
  expectedStartDate: z.string().optional(),
  // Sprint 1 (multipostagem/SEO) — validThrough do JobPosting JSON-LD.
  validThrough: z.string().optional(),
});

export type JobInput = z.infer<typeof jobSchema>;

import { z } from "zod";

// Sem opção de criar outro ADMIN por aqui — evita escalonamento acidental
// de privilégio num fluxo pensado pra ser rápido/informal.
export const INVITE_ROLES = ["HR", "EMPLOYEE"] as const;

export const INVITE_ROLE_LABELS: Record<(typeof INVITE_ROLES)[number], string> = {
  HR: "RH",
  EMPLOYEE: "Colaborador",
};

export const inviteUserSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido"),
  role: z.enum(INVITE_ROLES),
});

export type InviteUserInput = z.infer<typeof inviteUserSchema>;

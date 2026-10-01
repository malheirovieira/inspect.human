import { z } from "zod";

// Parametrização — integrações de divulgação de vagas. Todos opcionais
// (empresa sem nenhuma preenchida continua funcionando, só fica com menos
// plataforma disponível no cadastro de vaga).
export const companyIntegrationsSchema = z.object({
  indeedEmployerEmail: z.string().trim().email("E-mail inválido").optional().or(z.literal("")),
  linkedinCompanyId: z.string().trim().optional(),
  infojobsId: z.string().trim().optional(),
});

export type CompanyIntegrationsInput = z.infer<typeof companyIntegrationsSchema>;

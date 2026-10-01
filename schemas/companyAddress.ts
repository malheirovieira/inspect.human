import { z } from "zod";

// Sprint 1 (multipostagem/SEO) — endereço estruturado da empresa, usado só
// pro jobLocation.address do JobPosting JSON-LD. Tudo opcional: empresa sem
// endereço cadastrado continua funcionando normalmente, só sai com o
// endereço incompleto nas vagas públicas.
export const companyAddressSchema = z.object({
  addressStreet: z.string().optional(),
  addressCity: z.string().optional(),
  addressState: z.string().optional(),
  addressZip: z.string().optional(),
  addressCountry: z.string().optional(),
});

export type CompanyAddressInput = z.infer<typeof companyAddressSchema>;

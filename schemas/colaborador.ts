import { z } from "zod";

// Dependente (filho) — capturado como JSON no colaborador, sem tabela própria
// no MVP. Upload de documentos (caderneta de vacinação, comprovante escolar)
// fica para uma fase futura com Storage; aqui só os dados textuais.
export const dependentSchema = z.object({
  name: z.string().min(1, "Nome do dependente é obrigatório"),
  cpf: z.string().optional(),
  birthCertificateNumber: z.string().optional(),
});

export const createColaboradorSchema = z.object({
  // 1. Dados pessoais básicos
  name: z.string().min(1, "Nome completo é obrigatório"),
  email: z.string().email("E-mail inválido"),
  birthDate: z.string().min(1, "Data de nascimento é obrigatória"),
  sex: z.string().min(1, "Sexo é obrigatório"),
  nationality: z.string().min(1, "Nacionalidade é obrigatória"),
  birthplace: z.string().optional(),
  maritalStatus: z.string().min(1, "Estado civil é obrigatório"),
  motherName: z.string().min(1, "Nome da mãe é obrigatório"),
  fatherName: z.string().optional(),
  addressZip: z.string().min(1, "CEP é obrigatório"),
  addressStreet: z.string().min(1, "Endereço é obrigatório"),
  addressNumber: z.string().optional(),
  addressComplement: z.string().optional(),
  addressNeighborhood: z.string().optional(),
  addressCity: z.string().min(1, "Cidade é obrigatória"),
  addressState: z.string().min(1, "Estado é obrigatório"),
  phone: z.string().min(1, "Telefone é obrigatório"),
  educationLevel: z.string().optional(),
  raceColor: z.string().optional(),

  // 2. Documentos de identificação
  cpf: z.string().min(11, "CPF é obrigatório"),
  idDocumentType: z.string().optional(),
  idDocumentNumber: z.string().optional(),
  ctpsNumber: z.string().optional(),
  pisNumber: z.string().optional(),
  voterTitleNumber: z.string().optional(),
  reservistCertificate: z.string().optional(),
  civilRegistryType: z.string().optional(),
  civilRegistryNumber: z.string().optional(),

  // 3. Dados profissionais e contratuais
  department: z.string().optional(),
  position: z.string().min(1, "Cargo é obrigatório"),
  admissionDate: z.string().min(1, "Data de admissão é obrigatória"),
  salary: z.coerce.number().positive("Salário deve ser maior que zero"),
  workSchedule: z.string().min(1, "Jornada de trabalho é obrigatória"),
  registrationNumber: z.string().optional(),
  role: z.enum(["ADMIN", "HR", "EMPLOYEE"]),

  // 4. Dados bancários e benefícios
  bankName: z.string().optional(),
  bankAgency: z.string().optional(),
  bankAccount: z.string().optional(),
  transportVoucherOptIn: z.boolean(),
  dependents: z.array(dependentSchema).default([]),

  // 5. Saúde ocupacional
  admissionExamDate: z.string().optional(),
  admissionExamResult: z.string().optional(),
});

export type CreateColaboradorInput = z.infer<typeof createColaboradorSchema>;
export type Dependent = z.infer<typeof dependentSchema>;

// Campos de identidade que não mudam depois do cadastro — nunca aceitos numa
// edição, mesmo que venham no payload (o formulário já os deixa travados,
// mas a garantia real é aqui: o schema de update nem declara essas chaves).
export const LOCKED_COLABORADOR_FIELDS = [
  "birthDate",
  "sex",
  "nationality",
  "birthplace",
  "motherName",
  "fatherName",
  "cpf",
  "idDocumentType",
  "idDocumentNumber",
  "ctpsNumber",
  "pisNumber",
  "voterTitleNumber",
  "reservistCertificate",
  "civilRegistryType",
  "civilRegistryNumber",
] as const;

export const updateColaboradorSchema = createColaboradorSchema.omit({
  birthDate: true,
  sex: true,
  nationality: true,
  birthplace: true,
  motherName: true,
  fatherName: true,
  cpf: true,
  idDocumentType: true,
  idDocumentNumber: true,
  ctpsNumber: true,
  pisNumber: true,
  voterTitleNumber: true,
  reservistCertificate: true,
  civilRegistryType: true,
  civilRegistryNumber: true,
});

export type UpdateColaboradorInput = z.infer<typeof updateColaboradorSchema>;

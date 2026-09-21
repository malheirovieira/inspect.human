"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  createColaboradorSchema,
  updateColaboradorSchema,
  type CreateColaboradorInput,
  type UpdateColaboradorInput,
} from "@/schemas/colaborador";

export type CreateColaboradorResult = { error: string } | { success: true; userId: string };
export type ActionResult = { error: string } | { success: true };

// Server Action chamada pelo formulário de cadastro (components/colaboradores/ColaboradorForm.tsx).
export async function createColaborador(input: CreateColaboradorInput): Promise<CreateColaboradorResult> {
  const session = await requireRole(["ADMIN", "HR"]);

  const parsed = createColaboradorSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;

  const existing = await prisma.user.findFirst({
    where: { companyId: session.companyId, OR: [{ email: data.email }, { cpf: data.cpf }] },
  });
  if (existing) {
    return { error: "Já existe um colaborador com este e-mail ou CPF." };
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const temporaryPassword = crypto.randomUUID();

  const { data: created, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: data.email,
    password: temporaryPassword,
    email_confirm: true,
  });

  if (authError || !created.user) {
    return { error: authError?.message ?? "Falha ao criar acesso do colaborador." };
  }

  try {
    const user = await prisma.user.create({
      data: {
        id: created.user.id,
        companyId: session.companyId,
        name: data.name,
        email: data.email,
        role: data.role,
        birthDate: new Date(data.birthDate),
        sex: data.sex,
        nationality: data.nationality,
        birthplace: data.birthplace || null,
        maritalStatus: data.maritalStatus,
        motherName: data.motherName,
        fatherName: data.fatherName || null,
        addressZip: data.addressZip,
        addressStreet: data.addressStreet,
        addressNumber: data.addressNumber || null,
        addressComplement: data.addressComplement || null,
        addressNeighborhood: data.addressNeighborhood || null,
        addressCity: data.addressCity,
        addressState: data.addressState,
        phone: data.phone,
        educationLevel: data.educationLevel || null,
        raceColor: data.raceColor || null,
        cpf: data.cpf,
        idDocumentType: data.idDocumentType || null,
        idDocumentNumber: data.idDocumentNumber || null,
        ctpsNumber: data.ctpsNumber || null,
        pisNumber: data.pisNumber || null,
        voterTitleNumber: data.voterTitleNumber || null,
        reservistCertificate: data.reservistCertificate || null,
        civilRegistryType: data.civilRegistryType || null,
        civilRegistryNumber: data.civilRegistryNumber || null,
        department: data.department || null,
        position: data.position,
        admissionDate: new Date(data.admissionDate),
        salary: data.salary,
        workSchedule: data.workSchedule,
        registrationNumber: data.registrationNumber || null,
        bankName: data.bankName || null,
        bankAgency: data.bankAgency || null,
        bankAccount: data.bankAccount || null,
        transportVoucherOptIn: data.transportVoucherOptIn,
        dependents: data.dependents,
        admissionExamDate: data.admissionExamDate ? new Date(data.admissionExamDate) : null,
        admissionExamResult: data.admissionExamResult || null,
      },
    });
    return { success: true, userId: user.id };
  } catch {
    // Reverte o usuário de Auth já criado se a gravação no banco falhar,
    // pra não deixar um login órfão sem ficha correspondente.
    await supabaseAdmin.auth.admin.deleteUser(created.user.id).catch(() => {});
    return { error: "Falha ao salvar a ficha do colaborador." };
  }
}

// Só os campos "comumente alteráveis" (nome, contato, endereço, contrato,
// financeiro) — dados de identidade (CPF, RG, data de nascimento etc.) nem
// existem nesse schema, então não têm como ser sobrescritos aqui.
export async function updateColaborador(id: string, input: UpdateColaboradorInput): Promise<ActionResult> {
  const session = await requireRole(["ADMIN", "HR"]);

  const parsed = updateColaboradorSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;

  const colaborador = await prisma.user.findFirst({ where: { id, companyId: session.companyId } });
  if (!colaborador) return { error: "Colaborador não encontrado." };

  const emailTaken = await prisma.user.findFirst({
    where: { companyId: session.companyId, email: data.email, NOT: { id } },
  });
  if (emailTaken) return { error: "Já existe outro colaborador com este e-mail." };

  if (data.email !== colaborador.email) {
    const supabaseAdmin = createSupabaseAdminClient();
    const { error } = await supabaseAdmin.auth.admin.updateUserById(id, { email: data.email });
    if (error) return { error: error.message };
  }

  await prisma.user.update({
    where: { id },
    data: {
      name: data.name,
      email: data.email,
      role: data.role,
      maritalStatus: data.maritalStatus,
      addressZip: data.addressZip,
      addressStreet: data.addressStreet,
      addressNumber: data.addressNumber || null,
      addressComplement: data.addressComplement || null,
      addressNeighborhood: data.addressNeighborhood || null,
      addressCity: data.addressCity,
      addressState: data.addressState,
      phone: data.phone,
      educationLevel: data.educationLevel || null,
      raceColor: data.raceColor || null,
      department: data.department || null,
      position: data.position,
      admissionDate: new Date(data.admissionDate),
      salary: data.salary,
      workSchedule: data.workSchedule,
      registrationNumber: data.registrationNumber || null,
      bankName: data.bankName || null,
      bankAgency: data.bankAgency || null,
      bankAccount: data.bankAccount || null,
      transportVoucherOptIn: data.transportVoucherOptIn,
      dependents: data.dependents,
      admissionExamDate: data.admissionExamDate ? new Date(data.admissionExamDate) : null,
      admissionExamResult: data.admissionExamResult || null,
    },
  });

  return { success: true };
}

// Exclui o colaborador de verdade: apaga o usuário no Supabase Auth, e como
// public.users referencia auth.users com "on delete cascade" (e as tabelas
// de ponto/treinamento/folha referenciam public.users da mesma forma), o
// Postgres cascateia a remoção por todo o sistema numa operação só.
//
// TODO: hoje qualquer ADMIN/HR pode excluir. Falta permissão mais granular
// (ex.: só ADMIN, ou um nível acima de quem cadastrou) — avisado que isso
// ainda vem numa fase futura.
export async function deleteColaborador(id: string): Promise<ActionResult> {
  const session = await requireRole(["ADMIN", "HR"]);

  if (id === session.userId) {
    return { error: "Você não pode excluir seu próprio usuário." };
  }

  const colaborador = await prisma.user.findFirst({ where: { id, companyId: session.companyId } });
  if (!colaborador) return { error: "Colaborador não encontrado." };

  const supabaseAdmin = createSupabaseAdminClient();
  const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
  if (error) return { error: error.message };

  return { success: true };
}

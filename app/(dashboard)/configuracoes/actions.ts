"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { OPTION_CATEGORIES, type OptionCategory } from "@/services/companyOptions";
import { companyAddressSchema, type CompanyAddressInput } from "@/schemas/companyAddress";
import { companyIntegrationsSchema, type CompanyIntegrationsInput } from "@/schemas/companyIntegrations";
import { companyAiConfigSchema, type CompanyAiConfigInput } from "@/schemas/companyAiConfig";
import { zodFieldErrors, type FieldErrors } from "@/lib/fieldErrors";
import { createAiProvider } from "@/lib/ai/providers";
import { encryptApiKey, decryptApiKey } from "@/lib/ai/credentials";

export type ActionResult = { error: string } | { success: true };

// Sprint 1 (multipostagem/SEO) — endereço estruturado, usado só pro
// jobLocation.address do JobPosting JSON-LD das vagas desta empresa. Todos
// os campos opcionais: sem preencher, a vaga sai do JSON-LD com endereço
// incompleto (fallback só-país), mas nada trava.
export async function updateCompanyAddress(
  input: CompanyAddressInput
): Promise<ActionResult | { error: string; fieldErrors: FieldErrors }> {
  const session = await requireRole(["ADMIN"]);

  const parsed = companyAddressSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Corrija os campos destacados.", fieldErrors: zodFieldErrors(parsed.error) };
  }

  await prisma.company.update({
    where: { id: session.companyId },
    data: {
      addressStreet: parsed.data.addressStreet || null,
      addressCity: parsed.data.addressCity || null,
      addressState: parsed.data.addressState || null,
      addressZip: parsed.data.addressZip || null,
      addressCountry: parsed.data.addressCountry || "BR",
    },
  });

  revalidatePath("/configuracoes");
  return { success: true };
}

// Parametrização — Indeed (self-service, só e-mail), LinkedIn/InfoJobs (ID
// preenchível desde já, só funciona de verdade quando a flag global de
// cada um for ligada — ver lib/config/jobBoards.ts).
export async function updateCompanyIntegrations(
  input: CompanyIntegrationsInput
): Promise<ActionResult | { error: string; fieldErrors: FieldErrors }> {
  const session = await requireRole(["ADMIN"]);

  const parsed = companyIntegrationsSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Corrija os campos destacados.", fieldErrors: zodFieldErrors(parsed.error) };
  }

  await prisma.company.update({
    where: { id: session.companyId },
    data: {
      indeedEmployerEmail: parsed.data.indeedEmployerEmail || null,
      linkedinCompanyId: parsed.data.linkedinCompanyId || null,
      infojobsId: parsed.data.infojobsId || null,
    },
  });

  revalidatePath("/configuracoes");
  revalidatePath("/configuracoes/parametrizacao");
  return { success: true };
}

// Parametrização — IA própria da empresa (BYOK, Fase 1). apiKey write-only:
// vazio = mantém a chave já salva (só permitido se o provider não mudou —
// trocar de provider sem mandar chave nova seria usar uma credencial do
// provider ERRADO). Nunca loga nem devolve a chave em texto puro.
export async function updateCompanyAiConfig(
  input: CompanyAiConfigInput
): Promise<ActionResult | { error: string; fieldErrors: FieldErrors }> {
  const session = await requireRole(["ADMIN"]);

  const parsed = companyAiConfigSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Corrija os campos destacados.", fieldErrors: zodFieldErrors(parsed.error) };
  }

  const existing = await prisma.companyAiConfig.findUnique({ where: { companyId: session.companyId } });

  let apiKeyEncrypted: string;
  if (parsed.data.apiKey) {
    apiKeyEncrypted = encryptApiKey(parsed.data.apiKey);
  } else if (existing && existing.provider === parsed.data.provider) {
    apiKeyEncrypted = existing.apiKeyEncrypted;
  } else {
    return {
      error: "Corrija os campos destacados.",
      fieldErrors: { apiKey: "Informe a chave de API (obrigatória ao configurar pela primeira vez ou trocar de provedor)." },
    };
  }

  await prisma.companyAiConfig.upsert({
    where: { companyId: session.companyId },
    create: {
      companyId: session.companyId,
      provider: parsed.data.provider,
      apiKeyEncrypted,
      model: parsed.data.model,
      enabled: parsed.data.enabled,
    },
    update: { provider: parsed.data.provider, apiKeyEncrypted, model: parsed.data.model, enabled: parsed.data.enabled },
  });

  revalidatePath("/configuracoes/parametrizacao");
  return { success: true };
}

export type TestAiConnectionResult = { success: true } | { success: false; error: string };

// "Testar conexão" — chamada MÍNIMA real ao provider, não grava nada. Com
// apiKey vazio, usa a chave já salva (decifrada só na memória do servidor
// pra esta chamada, nunca volta ao cliente).
export async function testCompanyAiConnection(input: CompanyAiConfigInput): Promise<TestAiConnectionResult> {
  const session = await requireRole(["ADMIN"]);

  const parsed = companyAiConfigSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Corrija os campos antes de testar." };

  let apiKey = parsed.data.apiKey;
  if (!apiKey) {
    const existing = await prisma.companyAiConfig.findUnique({ where: { companyId: session.companyId } });
    if (!existing || existing.provider !== parsed.data.provider) {
      return { success: false, error: "Informe a chave de API para testar." };
    }
    try {
      apiKey = decryptApiKey(existing.apiKeyEncrypted);
    } catch {
      return { success: false, error: "Credencial salva corrompida — informe a chave novamente." };
    }
  }

  const provider = createAiProvider({ provider: parsed.data.provider, model: parsed.data.model, apiKey, allowRealData: true, error: null });
  if (!provider) return { success: false, error: "Provedor inválido." };

  try {
    const raw = await provider.generate({
      system: "Responda apenas com o JSON pedido, nada além disso.",
      input: "Teste de conexão — confirme respondendo o schema.",
      schemaName: "teste_conexao",
      jsonSchema: { type: "object", properties: { ok: { type: "boolean" } }, required: ["ok"] },
    });
    JSON.parse(raw); // só confirma que voltou algo parseável — o conteúdo exato não importa aqui.
    return { success: true };
  } catch (err) {
    // Mensagens dos providers (providerHttpError etc.) já vêm sem dado sensível — seguras pra mostrar.
    return { success: false, error: err instanceof Error ? err.message : "Falha ao conectar com o provedor." };
  }
}

export async function createCompanyOption(category: OptionCategory, label: string): Promise<ActionResult> {
  const session = await requireRole(["ADMIN", "HR"]);

  if (!OPTION_CATEGORIES.includes(category)) return { error: "Categoria inválida." };
  const trimmed = label.trim();
  if (!trimmed) return { error: "Digite um nome antes de adicionar." };

  const existing = await prisma.companyOption.findFirst({
    where: { companyId: session.companyId, category, label: trimmed },
  });
  if (existing) {
    if (existing.active) return { error: "Essa opção já existe." };
    await prisma.companyOption.update({ where: { id: existing.id }, data: { active: true } });
  } else {
    await prisma.companyOption.create({ data: { companyId: session.companyId, category, label: trimmed } });
  }

  revalidatePath("/configuracoes");
  return { success: true };
}

export async function deleteCompanyOption(optionId: string): Promise<ActionResult> {
  const session = await requireRole(["ADMIN", "HR"]);

  const option = await prisma.companyOption.findFirst({ where: { id: optionId, companyId: session.companyId } });
  if (!option) return { error: "Opção não encontrada." };

  await prisma.companyOption.update({ where: { id: optionId }, data: { active: false } });

  revalidatePath("/configuracoes");
  return { success: true };
}

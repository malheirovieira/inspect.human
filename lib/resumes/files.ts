import { createHash } from "node:crypto";

// Funções puras do versionamento de currículo — sem server-only/Prisma pra
// poderem ser usadas pelos testes e pelo script de backfill (mesma regra de
// caminho nos dois lados).

// Bucket PRIVADO do Supabase Storage — acesso só por URL assinada curta.
export const RESUME_BUCKET = "resumes";
export const MAX_RESUME_BYTES = 5 * 1024 * 1024;

// Validação do File recebido no formulário (antes de ler o conteúdo).
export function validateResumeFile(file: File): string | null {
  if (file.type !== "application/pdf") return "O currículo precisa ser um arquivo PDF.";
  if (file.size > MAX_RESUME_BYTES) return "O PDF do currículo precisa ter até 5MB.";
  return null;
}

// Todo PDF começa com "%PDF-".
export function isPdfBuffer(buffer: Uint8Array): boolean {
  return Buffer.from(buffer.subarray(0, 5)).toString("latin1") === "%PDF-";
}

export function sha256Hex(buffer: Uint8Array): string {
  return createHash("sha256").update(buffer).digest("hex");
}

// empresa/pessoa/<sha256>.pdf — o hash no caminho garante que arquivo
// diferente nunca sobrescreve outro (e o mesmo arquivo cai no mesmo caminho).
export function resumeStoragePath(companyId: string, candidateId: string, sha256: string): string {
  return `${companyId}/${candidateId}/${sha256}.pdf`;
}

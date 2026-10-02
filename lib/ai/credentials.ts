// Sem "server-only": igual a lib/ai/extract.ts e redact.ts, pra continuar
// testável em tests/unit (o marcador quebraria o import ali). Nunca é
// importado por Client Component mesmo assim — só por actions/services.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

// Criptografia da chave de IA da empresa (BYOK, Fase 1) — AES-256-GCM na
// camada da aplicação. A chave de criptografia vem de
// AI_CREDENTIALS_ENCRYPTION_KEY (só servidor, nunca commitada). Aceita
// 32 bytes em hex (64 chars) ou base64; qualquer outro formato/tamanho é
// reduzido a 32 bytes via SHA-256 (nunca trunca puro, nunca falha
// silenciosamente pra uma chave fraca).
function getEncryptionKey(): Buffer {
  const raw = process.env.AI_CREDENTIALS_ENCRYPTION_KEY;
  if (!raw) throw new Error("AI_CREDENTIALS_ENCRYPTION_KEY não configurada no ambiente.");

  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, "hex");

  try {
    const decoded = Buffer.from(raw, "base64");
    if (decoded.length === 32) return decoded;
  } catch {
    // segue para o fallback de hash abaixo
  }
  return createHash("sha256").update(raw).digest();
}

// Formato armazenado: "<iv>.<authTag>.<ciphertext>", cada parte em base64.
export function encryptApiKey(plainTextKey: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(12); // 96 bits — recomendado para GCM
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plainTextKey, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(".");
}

export function decryptApiKey(stored: string): string {
  const [ivB64, tagB64, dataB64] = stored.split(".");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("Credencial de IA em formato inválido.");

  const key = getEncryptionKey();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]);
  return decrypted.toString("utf8");
}

// Único formato aceitável pra mostrar a chave na interface: nunca mais que
// os últimos 4 caracteres, nunca o texto completo, nunca em log.
export function maskApiKey(plainTextKey: string): string {
  const last4 = plainTextKey.slice(-4);
  return `•••• ${last4}`;
}

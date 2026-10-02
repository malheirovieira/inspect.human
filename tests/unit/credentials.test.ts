import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { encryptApiKey, decryptApiKey, maskApiKey } from "@/lib/ai/credentials";

// Criptografia da chave de IA por empresa (BYOK, Fase 1) — garante que a
// chave nunca é recuperável sem a chave de criptografia, que o formato
// aguenta ida e volta, e que a máscara nunca vaza mais que os últimos 4
// caracteres (requisito explícito do pedido: "nunca mascarada parcialmente
// além do necessário pra exibição").
describe("credenciais de IA (AES-256-GCM)", () => {
  const ORIGINAL_ENV = process.env.AI_CREDENTIALS_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.AI_CREDENTIALS_ENCRYPTION_KEY = "chave-de-teste-nao-usar-em-producao";
  });

  afterEach(() => {
    process.env.AI_CREDENTIALS_ENCRYPTION_KEY = ORIGINAL_ENV;
  });

  it("decifra de volta exatamente o texto original", () => {
    const plain = "sk-ant-api03-chave-bem-secreta-1234";
    const encrypted = encryptApiKey(plain);
    expect(decryptApiKey(encrypted)).toBe(plain);
  });

  it("nunca grava o texto puro no valor armazenado", () => {
    const plain = "sk-ant-api03-chave-bem-secreta-1234";
    const encrypted = encryptApiKey(plain);
    expect(encrypted).not.toContain(plain);
  });

  it("cada chamada usa um IV diferente (nunca o mesmo ciphertext duas vezes)", () => {
    const plain = "mesma-chave-repetida";
    expect(encryptApiKey(plain)).not.toBe(encryptApiKey(plain));
  });

  it("falha ao decifrar com a chave de criptografia errada (nunca devolve lixo)", () => {
    const encrypted = encryptApiKey("qualquer-chave");
    process.env.AI_CREDENTIALS_ENCRYPTION_KEY = "outra-chave-de-criptografia-totalmente-diferente";
    expect(() => decryptApiKey(encrypted)).toThrow();
  });

  it("falha ao decifrar um valor corrompido/adulterado", () => {
    const encrypted = encryptApiKey("qualquer-chave-bem-maior-que-um-bloco-pra-garantir-bytes-suficientes");
    const [iv, tag, data] = encrypted.split(".");
    // Inverte um caractere no meio do ciphertext — GCM detecta a adulteração
    // pela tag de autenticação e lança, em vez de decifrar lixo.
    const mid = Math.floor(data.length / 2);
    const flipped = data[mid] === "A" ? "B" : "A";
    const tampered = [iv, tag, data.slice(0, mid) + flipped + data.slice(mid + 1)].join(".");
    expect(() => decryptApiKey(tampered)).toThrow();
  });

  it("máscara mostra só os últimos 4 caracteres, nunca a chave inteira", () => {
    const plain = "sk-ant-api03-chave-bem-secreta-1234";
    const masked = maskApiKey(plain);
    expect(masked).toBe("•••• 1234");
    expect(masked).not.toContain("chave-bem-secreta");
  });
});

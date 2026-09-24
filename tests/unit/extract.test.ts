import { describe, expect, it } from "vitest";
import { extractResumeText, hasReadableText } from "@/lib/ai/extract";
import { imageOnlyPdf, textResumePdf } from "../fixtures/resumes";

describe("extração de texto do PDF", () => {
  it("extrai o texto de um currículo com texto, preservando as linhas", async () => {
    const result = await extractResumeText(await textResumePdf());
    expect(result.status).toBe("OK");
    if (result.status !== "OK") return;
    expect(result.pageCount).toBe(1);
    expect(result.text).toContain("Analista de Dados Pleno - Empresa Exemplo Ltda.");
    expect(result.text).toContain("Bacharelado em Estatística");
    expect(result.text.split("\n").length).toBeGreaterThan(10);
  });

  it("PDF só com imagem (digitalizado) vira Sem texto legível", async () => {
    const result = await extractResumeText(await imageOnlyPdf());
    expect(result.status).toBe("NO_TEXT");
  });

  it("PDF com pouquíssimo texto vira Sem texto legível", async () => {
    const result = await extractResumeText(await textResumePdf(["Currículo digitalizado", "pág. 1"]));
    expect(result.status).toBe("NO_TEXT");
  });

  it("arquivo corrompido vira PDF inválido, sem lançar", async () => {
    const result = await extractResumeText(Buffer.from("%PDF-1.4\nisto não é um pdf de verdade"));
    expect(result.status).toBe("INVALID_PDF");
  });

  it("limiar de legibilidade: total e por página", () => {
    const letras = (n: number) => "a".repeat(n);
    expect(hasReadableText(letras(199), 1)).toBe(false);
    expect(hasReadableText(letras(200), 1)).toBe(true);
    expect(hasReadableText(letras(240), 5)).toBe(false); // 48 por página
    expect(hasReadableText(letras(250), 5)).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { MAX_RESUME_BYTES, isPdfBuffer, resumeStoragePath, sha256Hex, validateResumeFile } from "@/lib/resumes/files";

describe("arquivos de currículo", () => {
  it("reconhece PDF pela assinatura, não pela extensão", () => {
    expect(isPdfBuffer(Buffer.from("%PDF-1.7\n..."))).toBe(true);
    expect(isPdfBuffer(Buffer.from("PK\u0003\u0004 docx disfarçado"))).toBe(false);
    expect(isPdfBuffer(Buffer.from("%PD"))).toBe(false);
    expect(isPdfBuffer(Buffer.alloc(0))).toBe(false);
  });

  it("calcula SHA-256 em hex", () => {
    expect(sha256Hex(Buffer.from("abc"))).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("monta o caminho empresa/pessoa/<sha256>.pdf", () => {
    expect(resumeStoragePath("emp", "pes", "f".repeat(64))).toBe(`emp/pes/${"f".repeat(64)}.pdf`);
  });

  it("valida tipo e tamanho do arquivo enviado", () => {
    expect(validateResumeFile(new File(["%PDF-"], "cv.pdf", { type: "application/pdf" }))).toBeNull();
    expect(validateResumeFile(new File(["x"], "cv.docx", { type: "application/msword" }))).toMatch(/PDF/);
    const big = new File([new Uint8Array(MAX_RESUME_BYTES + 1)], "cv.pdf", { type: "application/pdf" });
    expect(validateResumeFile(big)).toMatch(/5MB/);
  });
});

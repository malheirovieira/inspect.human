import { describe, expect, it } from "vitest";
import { assertConsentSubject, InvalidConsentSubjectError } from "@/lib/consent";

// Consent agora aceita 3 tipos de sujeito (Fase 2) — o banco só garante
// "pelo menos um" (CHECK constraint), então esta função é a única barreira
// real contra um Consent com dois ou três sujeitos preenchidos ao mesmo
// tempo, ou nenhum.
describe("assertConsentSubject (XOR do sujeito do consentimento)", () => {
  it("aceita só candidateId preenchido", () => {
    expect(() => assertConsentSubject({ candidateId: "c1" })).not.toThrow();
  });

  it("aceita só userId preenchido", () => {
    expect(() => assertConsentSubject({ userId: "u1" })).not.toThrow();
  });

  it("aceita só employeeExitId preenchido", () => {
    expect(() => assertConsentSubject({ employeeExitId: "e1" })).not.toThrow();
  });

  it("rejeita nenhum sujeito preenchido", () => {
    expect(() => assertConsentSubject({})).toThrow(InvalidConsentSubjectError);
  });

  it("rejeita dois sujeitos preenchidos ao mesmo tempo", () => {
    expect(() => assertConsentSubject({ candidateId: "c1", userId: "u1" })).toThrow(InvalidConsentSubjectError);
  });

  it("rejeita os três sujeitos preenchidos ao mesmo tempo", () => {
    expect(() =>
      assertConsentSubject({ candidateId: "c1", userId: "u1", employeeExitId: "e1" })
    ).toThrow(InvalidConsentSubjectError);
  });

  it("trata null e undefined como 'não preenchido'", () => {
    expect(() => assertConsentSubject({ candidateId: "c1", userId: null, employeeExitId: undefined })).not.toThrow();
  });
});

// Fase 2 — Consent agora aceita 3 tipos de sujeito (candidato, colaborador
// avulso, ou vinculado a um desligamento específico). O banco só garante
// "pelo menos um" (constraint consents_has_subject, migration 0040) — o
// XOR exato (EXATAMENTE um, nunca dois nem três) é responsabilidade de
// quem cria o registro. Toda criação de Consent deve passar por aqui antes
// do prisma.consent.create.
export type ConsentSubject = {
  candidateId?: string | null;
  userId?: string | null;
  employeeExitId?: string | null;
};

export class InvalidConsentSubjectError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidConsentSubjectError";
  }
}

// Lança se não for EXATAMENTE um sujeito preenchido — nunca silencioso,
// nunca "corrige sozinho" escolhendo um dos três.
export function assertConsentSubject(subject: ConsentSubject): void {
  const filled = [subject.candidateId, subject.userId, subject.employeeExitId].filter(
    (value) => value !== null && value !== undefined
  );
  if (filled.length !== 1) {
    throw new InvalidConsentSubjectError(
      `Consent precisa de exatamente um sujeito (candidateId, userId ou employeeExitId) — recebeu ${filled.length}.`
    );
  }
}

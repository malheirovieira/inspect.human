"use client";

import { useState, useTransition } from "react";
import { setCandidateTestFlag } from "@/app/(dashboard)/recrutamento/banco-de-talentos/actions";

// Só renderizado pra ADMIN (a action também confere). Recebe só dados
// serializáveis — a action é importada aqui, nunca passada por prop.
export function CandidateTestToggle({ candidateId, isTest }: { candidateId: string; isTest: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-secondary)" }}>
      <input
        type="checkbox"
        checked={isTest}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.checked;
          startTransition(async () => {
            setError(null);
            const result = await setCandidateTestFlag(candidateId, next);
            if ("error" in result) setError(result.error);
          });
        }}
      />
      Candidato de teste (dados fictícios)
      {error && <span style={{ fontSize: 12, color: "var(--danger)" }}>{error}</span>}
    </label>
  );
}

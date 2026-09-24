"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, MoreVertical } from "lucide-react";
import { setCandidateTestFlag } from "@/app/(dashboard)/recrutamento/banco-de-talentos/actions";

// Menu de opções do perfil (⋮) — lugar discreto pra ações raras. Hoje só
// "Candidato de teste", e só é renderizado pra ADMIN (a action também
// confere). Recebe só dados serializáveis.
export function CandidateOptionsMenu({ candidateId, isTest }: { candidateId: string; isTest: boolean }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggleTest() {
    setError(null);
    startTransition(async () => {
      const result = await setCandidateTestFlag(candidateId, !isTest);
      if ("error" in result) setError(result.error);
      else setOpen(false);
    });
  }

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button
        type="button"
        className="fin-icon-btn"
        aria-label="Opções do candidato"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreVertical size={16} />
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 6px)",
            zIndex: 20,
            minWidth: 260,
            padding: 6,
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)",
            background: "var(--surface)",
            boxShadow: "var(--shadow-hover)",
          }}
        >
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={isTest}
            disabled={pending}
            onClick={toggleTest}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: "100%",
              padding: "8px 10px",
              border: "none",
              borderRadius: "var(--radius-sm)",
              background: "none",
              cursor: pending ? "wait" : "pointer",
              fontSize: 13,
              textAlign: "left",
              color: "var(--text-primary)",
            }}
            className="hover:bg-gray-50"
          >
            <span
              style={{
                width: 16,
                height: 16,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 4,
                border: "1px solid var(--gray-400)",
                background: isTest ? "var(--action-confirm)" : "transparent",
                color: "var(--white)",
              }}
            >
              {isTest && <Check size={12} />}
            </span>
            <span>
              Candidato de teste
              <span style={{ display: "block", fontSize: 11, color: "var(--text-muted)" }}>Dados fictícios — só administradores</span>
            </span>
          </button>
          {error && <div className="fin-field-error" style={{ padding: "4px 10px" }}>{error}</div>}
        </div>
      )}
    </div>
  );
}

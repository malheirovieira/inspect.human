"use client";

import { useRef } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PLAN_CONTACT_URL } from "@/lib/plans";

// "Assinar" de um plano que não é o atual. Ainda não existe cobrança nem
// troca de plano: só abre o aviso "Em breve" com um contato PROVISÓRIO
// (PLAN_CONTACT_URL, lib/plans.ts). <dialog> nativo = foco preso e Esc fecham
// sozinhos.
export function SubscribeButton({
  planName,
  label = "Assinar",
  outline = false,
}: {
  planName: string;
  label?: string;
  outline?: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        className={`fin-plan-card__cta${outline ? " fin-plan-card__cta--outline" : ""}`}
        onClick={() => dialogRef.current?.showModal()}
      >
        {label}
      </button>
      <dialog
        ref={dialogRef}
        className="fin-dialog"
        aria-labelledby={`plan-dialog-${planName}`}
        onClick={(e) => {
          // clique no fundo (fora da caixa) fecha
          if (e.target === dialogRef.current) dialogRef.current?.close();
        }}
      >
        <div className="fin-dialog__body">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <h2 id={`plan-dialog-${planName}`} className="fin-heading" style={{ margin: 0 }}>
              Em breve
            </h2>
            <Button
              type="button"
              variant="icon-cancel"
              onClick={() => dialogRef.current?.close()}
              aria-label="Fechar"
              title="Fechar"
              style={{ width: 32, height: 32 }}
            >
              <X size={16} />
            </Button>
          </div>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: "8px 0 16px" }}>
            Fale com a gente para mudar para o plano <strong>{planName}</strong>.
          </p>
          <a href={PLAN_CONTACT_URL} className="fin-btn fin-btn--confirm" style={{ textDecoration: "none" }}>
            Falar com a gente
          </a>
        </div>
      </dialog>
    </>
  );
}

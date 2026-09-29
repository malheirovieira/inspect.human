"use client";

import { forwardRef } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "./Button";

// <dialog> nativo (mesmo padrão de SubscribeButton) — foco preso e Esc
// fecham sozinhos, sem precisar de lib de overlay. O chamador controla
// abertura via ref (dialogRef.current?.showModal()).
export const ConfirmDialog = forwardRef<
  HTMLDialogElement,
  {
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: "danger" | "warning";
    onConfirm: () => void;
  }
>(function ConfirmDialog({ title = "Confirmar ação", message, confirmLabel = "Confirmar", cancelLabel = "Cancelar", variant = "danger", onConfirm }, ref) {
  return (
    <dialog
      ref={ref}
      className="fin-dialog"
      aria-labelledby="confirm-dialog-title"
      onClick={(e) => {
        // clique no fundo (fora da caixa) fecha
        if (e.target === e.currentTarget) (e.currentTarget as HTMLDialogElement).close();
      }}
    >
      <div className="fin-dialog__body">
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "var(--radius-full)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              background: variant === "danger" ? "var(--danger-surface)" : "var(--attention-surface, #fdf3d9)",
            }}
          >
            <AlertTriangle size={18} style={{ color: variant === "danger" ? "var(--danger)" : "var(--attention)" }} />
          </div>
          <h2 id="confirm-dialog-title" className="fin-heading" style={{ margin: 0, marginTop: 6 }}>
            {title}
          </h2>
        </div>

        <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5, margin: "0 0 20px" }}>{message}</p>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button
            type="button"
            variant="secondary"
            onClick={(e) => (e.currentTarget.closest("dialog") as HTMLDialogElement | null)?.close()}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant === "danger" ? "danger" : "primary"}
            onClick={(e) => {
              (e.currentTarget.closest("dialog") as HTMLDialogElement | null)?.close();
              onConfirm();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
});

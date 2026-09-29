"use client";

import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "./ConfirmDialog";

type DeleteButtonVariant =
  // Isolado, fundo vermelho, circular — cabeçalhos de detalhe (candidatura, vaga).
  | "circle"
  // Sem fundo, só o ícone colorido — linha de tabela densa (ao lado de Editar).
  | "ghost"
  // Ícone + texto, largura total — listagens em grid de card.
  | "text";

export function DeleteButton({
  onConfirm,
  ariaLabel,
  confirmMessage,
  confirmTitle = "Confirmar exclusão",
  label = "Excluir",
  variant = "circle",
  disabled = false,
}: {
  // Já deve tratar a chamada à action e navegar/revalidar em caso de
  // sucesso — o DeleteButton só captura erro (throw) pra exibir inline.
  onConfirm: () => Promise<void>;
  ariaLabel: string;
  confirmMessage: string;
  confirmTitle?: string;
  label?: string;
  variant?: DeleteButtonVariant;
  disabled?: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir");
    } finally {
      setLoading(false);
    }
  }

  const dialog = (
    <ConfirmDialog
      ref={dialogRef}
      title={confirmTitle}
      message={confirmMessage}
      confirmLabel={label}
      variant="danger"
      onConfirm={handleConfirm}
    />
  );

  if (variant === "text") {
    return (
      <>
        <button
          type="button"
          onClick={() => dialogRef.current?.showModal()}
          disabled={disabled || loading}
          aria-label={ariaLabel}
          className="fin-btn fin-btn--danger"
          style={{ width: "100%" }}
        >
          <Trash2 size={14} />
          {loading ? "Excluindo..." : label}
        </button>
        {error && <span className="fin-field-error">{error}</span>}
        {dialog}
      </>
    );
  }

  if (variant === "ghost") {
    return (
      <>
        <button
          type="button"
          onClick={() => dialogRef.current?.showModal()}
          disabled={disabled || loading}
          aria-label={ariaLabel}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            borderRadius: "var(--radius-sm)",
            border: "none",
            background: "none",
            color: "var(--action-cancel)",
            cursor: disabled || loading ? "not-allowed" : "pointer",
          }}
        >
          <Trash2 size={16} />
        </button>
        {dialog}
      </>
    );
  }

  // circle
  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        disabled={disabled || loading}
        aria-label={ariaLabel}
        title={label}
        className="fin-header-icon-btn"
        style={{ background: "var(--action-cancel)" }}
      >
        <Trash2 size={16} />
      </button>
      {dialog}
    </>
  );
}

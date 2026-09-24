import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

// confirm = salvar/confirmar/atualizar (verde); danger = cancelar/excluir
// (vermelho) — regra do sistema inteiro, ver --action-confirm/--action-cancel
// em globals.css. primary fica pra ação principal que não é gravação (ex.:
// alternância de visualização).
type Variant = "primary" | "secondary" | "confirm" | "danger" | "disabled" | "round-add" | "round-cancel" | "icon-cancel";

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={cn(
        "fin-btn",
        variant === "primary" && "fin-btn--primary",
        variant === "secondary" && "fin-btn--secondary",
        variant === "confirm" && "fin-btn--confirm",
        variant === "danger" && "fin-btn--danger",
        variant === "disabled" && "fin-btn--disabled",
        variant === "round-add" && "fin-btn--round fin-btn--round-add",
        variant === "round-cancel" && "fin-btn--round fin-btn--round-cancel",
        variant === "icon-cancel" && "fin-btn--icon-cancel",
        className
      )}
      disabled={variant === "disabled" || props.disabled}
      {...props}
    />
  );
}

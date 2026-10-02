import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

// Fluent 2: primary/confirm/round-add preenchidos em --accent (salvar é a
// ação primária); danger/icon-cancel/round-cancel em --red (cancelar/
// excluir/remover); secondary branco com borda. Ver .fin-btn em
// app/globals.css — a fonte da verdade das cores é lá, não este comentário.
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

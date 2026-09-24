import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "disabled" | "round-add" | "round-cancel";

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
        variant === "disabled" && "fin-btn--disabled",
        variant === "round-add" && "fin-btn--round fin-btn--round-add",
        variant === "round-cancel" && "fin-btn--round fin-btn--round-cancel",
        className
      )}
      disabled={variant === "disabled" || props.disabled}
      {...props}
    />
  );
}

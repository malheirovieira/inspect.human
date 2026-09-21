import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "disabled";

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
        className
      )}
      disabled={variant === "disabled" || props.disabled}
      {...props}
    />
  );
}

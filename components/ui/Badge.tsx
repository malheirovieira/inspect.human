import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

type Tone = "success" | "primary" | "danger";

export function Badge({
  tone = "success",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "fin-badge",
        tone === "success" && "fin-badge--success",
        tone === "primary" && "fin-badge--primary",
        tone === "danger" && "fin-badge--danger",
        className
      )}
      {...props}
    />
  );
}

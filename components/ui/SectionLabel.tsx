import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

// Rótulo de seção em versalete com espaçamento entre letras (ex. "RESUMO
// EXECUTIVO") — cor da marca em opacidade reduzida. Ver .fin-section-label.
export function SectionLabel({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("fin-section-label", className)} {...props} />;
}

import { cn } from "@/lib/utils";

// Wordmark oficial: só o nome, sem ícone, na fonte serifada (mesma família
// usada pelo Inspect Finance). Nunca combinar com um ícone ao lado.
export function Logo({ tone = "dark", className }: { tone?: "dark" | "light"; className?: string }) {
  return (
    <span
      className={cn("brand-wordmark", tone === "light" && "brand-wordmark--light", className)}
    >
      Inspect Human
    </span>
  );
}

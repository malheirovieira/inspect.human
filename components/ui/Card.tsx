import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Card({
  muted,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { muted?: boolean }) {
  return <div className={cn("fin-card", muted && "fin-card--muted", className)} {...props} />;
}

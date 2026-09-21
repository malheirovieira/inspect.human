import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  meta,
  selected,
}: {
  label: string;
  value: string;
  meta?: string;
  selected?: boolean;
}) {
  return (
    <div className={cn("fin-statcard", selected && "fin-statcard--selected")}>
      <span className={selected ? "fin-statcard__eyebrow" : "fin-statcard__label"}>{label}</span>
      <span className="fin-statcard__value">{value}</span>
      {meta && <span className="fin-statcard__meta">{meta}</span>}
    </div>
  );
}

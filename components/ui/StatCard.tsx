import { ArrowUp, ArrowDown, Minus, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Trend = { direction: "up" | "down" | "neutral"; label: string };

function TrendText({ trend }: { trend: Trend }) {
  const Icon = trend.direction === "up" ? ArrowUp : trend.direction === "down" ? ArrowDown : Minus;
  return (
    <span
      className="inline-flex items-center gap-0.5 text-xs font-medium"
      style={{ color: trend.direction === "up" ? "var(--green-700)" : "var(--text-muted)" }}
    >
      <Icon size={12} />
      {trend.label}
    </span>
  );
}

export function StatCard({
  label,
  value,
  meta,
  icon: Icon,
  trend,
  selected,
  featured,
  lift,
}: {
  label: string;
  value: string;
  meta?: string;
  icon?: LucideIcon;
  trend?: Trend;
  selected?: boolean;
  featured?: boolean;
  // Mesmo efeito de hover (levantar) e mesmo estilo de título (maiúsculo)
  // do card "Colaboradores" do dashboard — opcional pra não afetar outras
  // telas que reusam StatCard (ex.: Gestão/KPIs) sem pedir isso.
  lift?: boolean;
}) {
  if (selected) {
    return (
      <div
        className={cn("flex flex-1 flex-col justify-between text-white", featured ? "fin-statcard-featured p-4" : "rounded-lg p-5")}
        style={featured ? undefined : { background: "var(--ink)" }}
      >
        <div className="flex items-start justify-between gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-white/50">{label}</span>
          {Icon && (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15">
              <Icon size={16} />
            </span>
          )}
        </div>
        <div className="mt-4 flex items-end justify-between gap-3">
          <div className="text-4xl font-bold leading-none">{value}</div>
          {meta && <span className="pb-1 text-xs text-white/60">{meta}</span>}
        </div>
        {trend && (
          <div className="mt-3 flex items-center gap-1.5 text-xs">
            <span className="font-medium" style={{ color: "var(--green-400)" }}>
              Δ {trend.label}
            </span>
            <span className="text-white/50">vs. último mês</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-1 flex-col gap-3 rounded-lg border border-[var(--border)] bg-white p-4",
        lift && "fin-card-hover-lift"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        {Icon && <Icon size={16} className="text-ink" />}
        {trend && <TrendText trend={trend} />}
      </div>
      <div>
        <div className={lift ? "text-[11px] font-semibold uppercase tracking-wide text-gray-500" : "text-xs text-gray-500"}>
          {label}
        </div>
        <div className="mt-1 text-2xl font-bold text-ink">{value}</div>
      </div>
    </div>
  );
}

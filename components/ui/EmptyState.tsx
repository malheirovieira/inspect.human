import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  // Opcional — quando ausente, o estado vazio fica só informativo (sem
  // botão nenhum), como antes.
  action?: ReactNode;
}) {
  return (
    <Card style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "56px 24px", textAlign: "center" }}>
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: "var(--radius-full)",
          background: "var(--surface-muted)",
          color: "var(--text-muted)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={22} />
      </div>
      <div className="fin-heading" style={{ marginTop: 0 }}>
        {title}
      </div>
      <p style={{ color: "var(--text-muted)", fontSize: 13, maxWidth: 360, margin: 0 }}>{description}</p>
      {action}
    </Card>
  );
}

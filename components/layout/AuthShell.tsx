import { CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

export function AuthShell({
  title,
  bullets,
  children,
}: {
  title: string;
  bullets: string[];
  children: React.ReactNode;
}) {
  return (
    <main className="auth-shell">
      <div className="auth-shell__frame">
        <div className="auth-shell__panel">
          <Logo tone="light" />

          <h1 className="auth-shell__title">{title}</h1>

          <ul className="auth-shell__bullets">
            {bullets.map((bullet) => (
              <li key={bullet}>
                <CheckCircle2 size={18} />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="auth-shell__form-area">
          <div className="fin-card auth-shell__card" style={{ boxShadow: "none", border: "none", padding: 0 }}>
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}

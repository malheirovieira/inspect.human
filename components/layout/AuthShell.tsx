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
          {/* divisória em onda entre o painel verde e o card branco */}
          <svg className="auth-shell__wave" viewBox="0 0 90 800" preserveAspectRatio="none" aria-hidden="true">
            <path
              d="M90,0 C40,110 100,220 45,330 C-10,440 60,560 30,670 C10,730 40,770 90,800 L90,0 Z"
              fill="var(--surface, #fff)"
            />
          </svg>

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
          <div className="fin-card auth-shell__card" style={{ boxShadow: "none", padding: 0 }}>
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}

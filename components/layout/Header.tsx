import { Bell } from "lucide-react";

export function Header({
  eyebrow = "INSPECT HUMAN",
  title,
}: {
  eyebrow?: string;
  title: string;
}) {
  return (
    <header className="fin-header">
      <div>
        <span className="fin-header__crumb">{eyebrow}</span>
        <h1 className="fin-header__title">{title}</h1>
      </div>
      <div className="fin-header__actions">
        <button className="fin-header__bell" aria-label="Notificações">
          <Bell size={18} />
          <span className="fin-header__dot" />
        </button>
      </div>
    </header>
  );
}

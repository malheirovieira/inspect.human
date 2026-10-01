import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { HeaderSearch } from "./HeaderSearch";
import { NotificationBell } from "./NotificationBell";
import { UpgradeButton } from "./UpgradeButton";

export type BreadcrumbItem = { label: string; href?: string };

// Data de hoje, formatada — mesmo formato que só a tela Início passava
// manualmente antes (ex.: "1 de outubro, 2026"). Vira o padrão de todas as
// páginas: `date` continua aceito pra quem quiser sobrescrever, mas agora é
// opcional de verdade (sem ele, nunca mais fica em branco).
function todayLabel(): string {
  const now = new Date();
  const dayMonth = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long" }).format(now);
  return `${dayMonth}, ${now.getFullYear()}`;
}

export function Header({
  eyebrow = "INSPECT TALENT",
  title,
  subtitle,
  date = todayLabel(),
  searchPlaceholder,
  backHref,
  breadcrumb,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  date?: string;
  searchPlaceholder?: string;
  backHref?: string;
  breadcrumb?: BreadcrumbItem[];
}) {
  return (
    <>
      <div className="fin-topbar">
        <div className="fin-topbar__inner">
          {date && <span className="fin-topbar__date">{date}</span>}
          <div className="fin-topbar__search">
            {searchPlaceholder && <HeaderSearch placeholder={searchPlaceholder} />}
          </div>
          <UpgradeButton />
          <NotificationBell />
        </div>
      </div>
      <header className="fin-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {backHref && (
            <Link href={backHref} className="fin-icon-btn" aria-label="Voltar" style={{ flexShrink: 0 }}>
              <ArrowLeft size={16} />
            </Link>
          )}
          <div>
            {breadcrumb && breadcrumb.length > 0 ? (
              <div className="fin-header__crumb">
                {breadcrumb.map((item, index) => (
                  <span key={index}>
                    {index > 0 && <span className="fin-header__crumb-sep">/</span>}
                    {item.href ? (
                      <Link href={item.href} className="fin-header__crumb-link">
                        {item.label}
                      </Link>
                    ) : (
                      item.label
                    )}
                  </span>
                ))}
              </div>
            ) : (
              <span className="fin-header__crumb">{eyebrow}</span>
            )}
            <h1 className="fin-header__title">{title}</h1>
            {subtitle && <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-muted)" }}>{subtitle}</p>}
          </div>
        </div>
      </header>
    </>
  );
}

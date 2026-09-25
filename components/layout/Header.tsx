import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { HeaderSearch } from "./HeaderSearch";
import { NotificationBell } from "./NotificationBell";
import { UpgradeButton } from "./UpgradeButton";

export type BreadcrumbItem = { label: string; href?: string };

export function Header({
  eyebrow = "INSPECT TALENT",
  title,
  subtitle,
  date,
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

import Link from "next/link";
import { ArrowLeft, Bell } from "lucide-react";
import { HeaderSearch } from "./HeaderSearch";

export type BreadcrumbItem = { label: string; href?: string };

export function Header({
  eyebrow = "INSPECT HUMAN",
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
      <div className="fin-header__actions">
        {date && (
          <span style={{ fontSize: 13, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{date}</span>
        )}
        {searchPlaceholder && <HeaderSearch placeholder={searchPlaceholder} />}
        <button className="fin-header__bell" aria-label="Notificações">
          <Bell size={18} />
          <span className="fin-header__dot" />
        </button>
      </div>
    </header>
  );
}

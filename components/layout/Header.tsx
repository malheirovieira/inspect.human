import Link from "next/link";
import { ArrowLeft, PanelLeft } from "lucide-react";
import { AnimatedSidebarTrigger } from "@/components/ui/animated-sidebar";
import { HeaderSearch } from "./HeaderSearch";
import { NotificationBell } from "./NotificationBell";
import { UpgradeButton } from "./UpgradeButton";

export type BreadcrumbItem = { label: string; href?: string };

export function Header({
  eyebrow = "INSPECT TALENT",
  title,
  subtitle,
  searchPlaceholder,
  backHref,
  breadcrumb,
  compact,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  searchPlaceholder?: string;
  backHref?: string;
  breadcrumb?: BreadcrumbItem[];
  // Só a barra do topo, sem o bloco de título grande (a página monta o
  // próprio cabeçalho — ex.: a saudação da tela Início).
  compact?: boolean;
}) {
  return (
    <>
      <div className="fin-topbar">
        <div className="fin-topbar__inner">
          <AnimatedSidebarTrigger className="text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-950">
            <PanelLeft aria-hidden="true" className="size-4" />
          </AnimatedSidebarTrigger>
          <div className="fin-topbar__divider" />
          <span className="fin-topbar__title">{title}</span>
          <div className="fin-topbar__search">{searchPlaceholder && <HeaderSearch placeholder={searchPlaceholder} />}</div>
          <UpgradeButton />
          <NotificationBell />
        </div>
      </div>
      {!compact && (
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
      )}
    </>
  );
}

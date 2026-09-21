"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  LayoutGrid,
  Users,
  Briefcase,
  GraduationCap,
  Clock,
  Wallet,
  TrendingUp,
  Settings,
  HelpCircle,
  LogOut,
  ChevronRight,
  ChevronLeft,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon?: LucideIcon;
  disabled?: boolean;
};

type NavGroup = {
  label: string;
  icon: LucideIcon;
  items: NavItem[];
};

const EASE = "[transition-timing-function:cubic-bezier(0.22,1,0.36,1)]";
const COLLAPSE_STORAGE_KEY = "inspect-human:sidebar-collapsed";
// Label some texto que só existe quando expandida — sempre montado, só
// desvanece via opacidade, pra acompanhar a largura animando junto em vez
// de sumir/aparecer de golpe.
const LABEL_FADE = cn("overflow-hidden whitespace-nowrap transition-opacity duration-300", EASE);

const DASHBOARD: NavItem & { icon: LucideIcon } = {
  href: "/dashboard",
  label: "Dashboard",
  icon: LayoutGrid,
};

const GROUPS: NavGroup[] = [
  {
    label: "Pessoas",
    icon: Users,
    items: [
      { href: "/colaboradores", label: "Colaboradores" },
      { href: "/desligamentos", label: "Desligamentos" },
    ],
  },
  {
    label: "Recrutamento",
    icon: Briefcase,
    items: [
      { href: "/recrutamento/vagas", label: "Vagas" },
      { href: "/recrutamento/candidatos", label: "Candidatos" },
    ],
  },
  {
    label: "Desenvolvimento",
    icon: GraduationCap,
    items: [
      { href: "/desenvolvimento/trilhas", label: "Trilhas" },
      { href: "/desenvolvimento/progresso", label: "Progresso" },
    ],
  },
  {
    label: "Ponto",
    icon: Clock,
    items: [
      { href: "/meu-ponto", label: "Meu Ponto" },
      { href: "/meu-espelho", label: "Espelho de Ponto" },
    ],
  },
  {
    label: "Folha",
    icon: Wallet,
    items: [
      { href: "/folha/variaveis", label: "Variáveis" },
      { href: "/folha/relatorios", label: "Relatórios" },
    ],
  },
  {
    label: "Gestão",
    icon: TrendingUp,
    items: [
      { href: "/gestao/kpis", label: "KPIs" },
      { href: "/gestao/relatorios", label: "Relatórios" },
      { href: "/gestao/budget", label: "Budget" },
    ],
  },
];

const OUTROS: (NavItem & { icon: LucideIcon })[] = [
  { href: "/configuracoes", label: "Configurações", icon: Settings },
  { href: "/ajuda", label: "Ajuda", icon: HelpCircle, disabled: true },
];

function groupForPath(pathname: string): string | null {
  const group = GROUPS.find((g) => g.items.some((item) => pathname.startsWith(item.href)));
  return group ? group.label : null;
}

function SimpleNavItem({
  item,
  pathname,
  collapsed,
}: {
  item: NavItem & { icon: LucideIcon };
  pathname: string;
  collapsed: boolean;
}) {
  const active = pathname.startsWith(item.href);
  const Icon = item.icon;

  if (item.disabled) {
    return (
      <span
        title={collapsed ? item.label : undefined}
        className={cn(
          "flex cursor-not-allowed items-center rounded-xl px-3 py-2.5 text-sm font-medium text-gray-400 transition-all duration-300",
          EASE,
          collapsed ? "justify-center gap-0 px-0" : "gap-2"
        )}
      >
        <Icon size={18} className="shrink-0" />
        <span
          className={cn(
            LABEL_FADE,
            "text-left",
            collapsed ? "w-0 flex-none opacity-0" : "w-auto flex-1 opacity-100"
          )}
        >
          {item.label}
        </span>
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={cn(
        "flex items-center rounded-xl border px-3 py-2.5 text-sm font-medium transition-all duration-300",
        EASE,
        collapsed ? "justify-center gap-0 px-0" : "gap-2",
        active
          ? "border-primary text-primary"
          : "border-transparent text-gray-600 hover:bg-gray-100"
      )}
    >
      <Icon size={18} className={cn("shrink-0", active ? "text-primary" : "text-gray-400")} />
      <span
        className={cn(LABEL_FADE, "text-left", collapsed ? "w-0 flex-none opacity-0" : "w-auto flex-1 opacity-100")}
      >
        {item.label}
      </span>
    </Link>
  );
}

export function Sidebar({
  userName = "Gabriel Malheiro",
  companyName = "Sua empresa",
}: {
  userName?: string;
  companyName?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_STORAGE_KEY) === "1");
    } catch {
      // localStorage indisponível (modo privado etc.) — mantém expandida.
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ignora falha de storage
      }
      return next;
    });
  }

  async function handleLogout() {
    setLoggingOut(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = userName
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  const routeGroup = groupForPath(pathname);
  const [openGroup, setOpenGroup] = useState<string | null>(() => routeGroup);

  useEffect(() => {
    setOpenGroup(routeGroup);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  function toggleGroup(label: string) {
    if (collapsed) {
      setCollapsed(false);
      try {
        localStorage.setItem(COLLAPSE_STORAGE_KEY, "0");
      } catch {
        // ignora falha de storage
      }
      setOpenGroup(label);
      return;
    }
    setOpenGroup((prev) => (prev === label ? null : label));
  }

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen shrink-0 flex-col overflow-x-hidden overflow-y-auto border-r border-gray-200 bg-white transition-[width] duration-[400ms]",
        EASE,
        collapsed ? "w-[76px]" : "w-[280px]"
      )}
    >
      <div className={cn("flex h-full shrink-0 flex-col p-4", collapsed ? "w-[76px]" : "w-[280px]")}>
        <div
          className={cn(
            "fin-sidebar__profile border-b border-gray-200 transition-all duration-300",
            EASE,
            collapsed ? "mb-4 flex-col items-center gap-0 px-0 pb-0" : "mb-5 pb-4"
          )}
        >
          <div className="fin-sidebar__avatar order-1 shrink-0">{initials}</div>
          <div
            className={cn(
              LABEL_FADE,
              collapsed ? "order-3 h-0 w-0 opacity-0" : "order-2 h-auto w-auto flex-1 opacity-100"
            )}
          >
            <div className="fin-sidebar__name">{userName}</div>
            <div className="fin-sidebar__plan">{companyName}</div>
          </div>
          <button
            type="button"
            onClick={toggleCollapsed}
            title={collapsed ? "Expandir menu" : "Recolher menu"}
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors duration-300 hover:bg-gray-100 hover:text-gray-800",
              collapsed ? "order-2 mt-4" : "order-3 mt-1"
            )}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        <nav className={cn("flex flex-1 flex-col", collapsed ? "gap-2" : "gap-1")}>
          <SimpleNavItem item={DASHBOARD} pathname={pathname} collapsed={collapsed} />

          {GROUPS.map((group) => {
            const isOpen = !collapsed && openGroup === group.label;
            const isActiveRoute = group.label === routeGroup;
            const highlighted = collapsed ? isActiveRoute : isOpen;
            const Icon = group.icon;
            return (
              <div
                key={group.label}
                className={cn(
                  "rounded-xl border p-1 transition-all duration-300",
                  EASE,
                  isOpen ? "border-gray-200 bg-white shadow-sm" : "border-transparent",
                  !collapsed && openGroup && !isOpen && "opacity-45"
                )}
              >
                <button
                  type="button"
                  onClick={() => toggleGroup(group.label)}
                  aria-expanded={isOpen}
                  title={collapsed ? group.label : undefined}
                  className={cn(
                    "flex w-full items-center rounded-xl border px-3 py-2.5 text-sm font-medium transition-all duration-300",
                    EASE,
                    collapsed ? "justify-center gap-0 px-0" : "gap-2",
                    highlighted
                      ? "border-primary text-primary"
                      : "border-transparent text-gray-600 hover:bg-gray-100"
                  )}
                >
                  <Icon size={18} className={cn("shrink-0", highlighted ? "text-primary" : "text-gray-400")} />
                  <span
                    className={cn(
                      LABEL_FADE,
                      "flex items-center gap-2",
                      collapsed ? "w-0 flex-none opacity-0" : "w-auto flex-1 opacity-100"
                    )}
                  >
                    <span className="flex-1 text-left">{group.label}</span>
                    <ChevronRight
                      size={16}
                      className={cn(
                        "shrink-0 transition-transform duration-500",
                        EASE,
                        isOpen ? "rotate-90 text-primary" : "text-gray-400"
                      )}
                    />
                  </span>
                </button>

                <div
                  className={cn(
                    "grid transition-[grid-template-rows,opacity] duration-500",
                    EASE,
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  )}
                >
                  <ul className="overflow-hidden pl-4 pt-1">
                    {group.items.map((item) => {
                      const active = pathname.startsWith(item.href);
                      return (
                        <li key={item.href} className="py-0.5">
                          <Link
                            href={item.href}
                            className={cn(
                              "block w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors duration-300",
                              active ? "font-medium text-primary" : "text-gray-500 hover:text-gray-800"
                            )}
                          >
                            {item.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            );
          })}

          <div className={cn("mt-auto flex flex-col border-t border-gray-200 pt-3", collapsed ? "gap-2" : "gap-1")}>
            {OUTROS.map((item) => (
              <SimpleNavItem key={item.href} item={item} pathname={pathname} collapsed={collapsed} />
            ))}
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              title={collapsed ? (loggingOut ? "Saindo..." : "Sair") : undefined}
              className={cn(
                "flex items-center gap-2 rounded-xl border-l-[3px] border-transparent px-3 py-2.5 text-left text-sm font-medium text-gray-600 transition-all duration-300",
                EASE,
                collapsed && "justify-center px-0",
                loggingOut ? "cursor-not-allowed opacity-60" : "hover:bg-gray-100"
              )}
            >
              <LogOut size={18} className="shrink-0 text-gray-400" />
              <span
                className={cn(LABEL_FADE, "text-left", collapsed ? "w-0 flex-none opacity-0" : "w-auto flex-1 opacity-100")}
              >
                {loggingOut ? "Saindo..." : "Sair"}
              </span>
            </button>
          </div>
        </nav>
      </div>
    </aside>
  );
}

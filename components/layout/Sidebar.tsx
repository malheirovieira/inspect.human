"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  Home,
  Briefcase,
  Settings,
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
  section: string;
  // Rota da visão geral do módulo — clicar no nome do grupo navega pra cá
  // (a seta ao lado só abre/fecha o acordeão, sem navegar).
  href: string;
  items: NavItem[];
  disabled?: boolean;
};

const EASE = "[transition-timing-function:cubic-bezier(0.22,1,0.36,1)]";
const COLLAPSE_STORAGE_KEY = "inspect-talent:sidebar-collapsed";
// Chave do nome antigo do sistema (Inspect Human). Lida só pra migrar a
// preferência de quem já usava o sistema (ver readCollapsedPreference);
// pode sair depois que todos tiverem acessado ao menos uma vez.
const LEGACY_COLLAPSE_STORAGE_KEY = "inspect-human:sidebar-collapsed";

// Lê a preferência de menu recolhido. Sem valor na chave nova, aproveita o
// da antiga (grava na nova e apaga a antiga) — ninguém perde a preferência
// com a troca de nome.
function readCollapsedPreference(): boolean {
  const current = localStorage.getItem(COLLAPSE_STORAGE_KEY);
  if (current !== null) return current === "1";
  const legacy = localStorage.getItem(LEGACY_COLLAPSE_STORAGE_KEY);
  if (legacy !== null) {
    localStorage.setItem(COLLAPSE_STORAGE_KEY, legacy);
    localStorage.removeItem(LEGACY_COLLAPSE_STORAGE_KEY);
  }
  return legacy === "1";
}
// Label some texto que só existe quando expandida — sempre montado, só
// desvanece via opacidade, pra acompanhar a largura animando junto em vez
// de sumir/aparecer de golpe.
const LABEL_FADE = cn("overflow-hidden whitespace-nowrap transition-opacity duration-700", EASE);

// Não faz parte de nenhum grupo (fica fora de GROUPS, sem rótulo de seção
// acima) — é o pouso fixo pós-login, por isso nenhum grupo fica marcado
// como ativo quando o usuário está aqui.
const DASHBOARD: NavItem & { icon: LucideIcon } = {
  href: "/dashboard",
  label: "Início",
  icon: Home,
};

const GROUPS: NavGroup[] = [
  {
    label: "Recrutamento",
    icon: Briefcase,
    section: "PESSOAS",
    href: "/recrutamento",
    items: [
      { href: "/recrutamento/vagas", label: "Vagas" },
      { href: "/recrutamento/banco-de-talentos", label: "Banco de Talentos" },
      { href: "/recrutamento/testes", label: "Testes e Avaliações" },
    ],
  },
];

const SECTION_ORDER = ["PESSOAS"];

const OUTROS: (NavItem & { icon: LucideIcon })[] = [
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

function groupForPath(pathname: string): string | null {
  const group = GROUPS.find(
    (g) => pathname === g.href || g.items.some((item) => pathname.startsWith(item.href))
  );
  return group ? group.label : null;
}

function SectionLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  return (
    <div
      className={cn(
        LABEL_FADE,
        "px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400",
        collapsed ? "h-0 opacity-0" : "h-auto opacity-100"
      )}
    >
      {label}
    </div>
  );
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
          "flex cursor-not-allowed items-center rounded-xl px-3 py-2.5 text-sm font-medium text-gray-400 transition-all duration-700",
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
        "relative flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-700",
        EASE,
        collapsed ? "justify-center gap-0 px-0" : "gap-2",
        active ? "bg-gray-100 text-ink" : "text-gray-600 hover:bg-gray-100"
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-[18px] w-[3px] -translate-y-1/2 rounded-full bg-ink" />
      )}
      <Icon size={18} className={cn("shrink-0", active ? "text-ink" : "text-gray-400")} />
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
      setCollapsed(readCollapsedPreference());
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
        "sticky top-0 flex h-screen shrink-0 flex-col overflow-x-hidden overflow-y-auto border-r border-gray-200 bg-white transition-[width] duration-[700ms]",
        EASE,
        collapsed ? "w-[76px]" : "w-[280px]"
      )}
    >
      <div className={cn("flex h-full shrink-0 flex-col p-4", collapsed ? "w-[76px]" : "w-[280px]")}>
        <div
          className={cn(
            "fin-sidebar__profile transition-all duration-700",
            EASE,
            collapsed ? "mb-4 flex-col items-center gap-0 !px-0 !py-3" : "mb-5"
          )}
        >
          <div className="fin-sidebar__avatar shrink-0">{initials}</div>
          <div className={cn(LABEL_FADE, collapsed ? "h-0 w-0 opacity-0" : "h-auto w-auto flex-1 opacity-100")}>
            <div className="fin-sidebar__name">{userName}</div>
            <div className="fin-sidebar__plan">{companyName}</div>
          </div>
        </div>

        <nav className={cn("flex flex-1 flex-col", collapsed ? "gap-1" : "gap-0.5")}>
          <SimpleNavItem item={DASHBOARD} pathname={pathname} collapsed={collapsed} />

          {SECTION_ORDER.map((section) => (
            <Fragment key={section}>
              <SectionLabel label={section} collapsed={collapsed} />
              {GROUPS.filter((g) => g.section === section).map((group) => {
                const isOpen = !collapsed && openGroup === group.label;
                const isActiveRoute = group.label === routeGroup;
                const highlighted = collapsed ? isActiveRoute : isOpen;
                const Icon = group.icon;

                if (group.disabled) {
                  return (
                    <span
                      key={group.label}
                      title={collapsed ? group.label : undefined}
                      className={cn(
                        "flex cursor-not-allowed items-center rounded-xl px-3 py-2.5 text-sm font-medium text-gray-400 transition-all duration-700",
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
                        {group.label}
                      </span>
                    </span>
                  );
                }

                return (
                  <div
                    key={group.label}
                    className={cn(
                      "rounded-xl border p-1 transition-all duration-700",
                      EASE,
                      isOpen ? "border-gray-200 bg-white shadow-sm" : "border-transparent",
                      !collapsed && openGroup && !isOpen && "opacity-45"
                    )}
                  >
                    <Link
                      href={group.href}
                      onClick={() => toggleGroup(group.label)}
                      aria-expanded={isOpen}
                      title={collapsed ? group.label : undefined}
                      className={cn(
                        "flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-700",
                        EASE,
                        collapsed ? "justify-center gap-0 px-0" : "gap-2",
                        highlighted ? "bg-white text-ink" : "text-gray-600"
                      )}
                    >
                      <Icon size={18} className={cn("shrink-0", highlighted ? "text-ink" : "text-gray-400")} />
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
                            "shrink-0 transition-transform duration-700",
                            EASE,
                            isOpen ? "rotate-90 text-ink" : "text-gray-400"
                          )}
                        />
                      </span>
                    </Link>

                    <div
                      className={cn(
                        "grid transition-[grid-template-rows,opacity] duration-700",
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
                                  "block w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors duration-700",
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
            </Fragment>
          ))}

          <div className={cn("mt-auto flex flex-col border-t border-gray-200 pt-3", collapsed ? "gap-1" : "gap-0.5")}>
            <button
              type="button"
              onClick={toggleCollapsed}
              title={collapsed ? "Expandir menu" : "Recolher menu"}
              className={cn(
                "flex items-center rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 transition-all duration-700 hover:bg-gray-100",
                EASE,
                collapsed ? "justify-center gap-0 px-0" : "gap-2"
              )}
            >
              {collapsed ? (
                <ChevronRight size={18} className="shrink-0 text-gray-400" />
              ) : (
                <ChevronLeft size={18} className="shrink-0 text-gray-400" />
              )}
              <span
                className={cn(LABEL_FADE, "text-left", collapsed ? "w-0 flex-none opacity-0" : "w-auto flex-1 opacity-100")}
              >
                Recolher
              </span>
            </button>

            {OUTROS.map((item) => (
              <SimpleNavItem key={item.href} item={item} pathname={pathname} collapsed={collapsed} />
            ))}
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              title={collapsed ? (loggingOut ? "Saindo..." : "Sair") : undefined}
              className={cn(
                "flex items-center gap-2 rounded-xl border-l-[3px] border-transparent px-3 py-2.5 text-left text-sm font-medium text-gray-600 transition-all duration-700",
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

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
}: {
  item: NavItem & { icon: LucideIcon };
  pathname: string;
}) {
  const active = pathname.startsWith(item.href);
  const Icon = item.icon;

  if (item.disabled) {
    return (
      <span className="flex cursor-not-allowed items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-400">
        <Icon size={18} className="shrink-0" />
        <span className="flex-1 text-left">{item.label}</span>
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-2 rounded-xl border-l-[3px] px-3 py-2.5 text-sm font-medium transition-colors duration-300",
        active
          ? "border-primary bg-accent text-primary ring-1 ring-primary/40"
          : "border-transparent text-gray-600 hover:bg-gray-100"
      )}
    >
      <Icon size={18} className={active ? "text-primary" : "text-gray-400"} />
      <span className="flex-1 text-left">{item.label}</span>
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

  const [openGroup, setOpenGroup] = useState<string | null>(() => groupForPath(pathname));

  useEffect(() => {
    setOpenGroup(groupForPath(pathname));
  }, [pathname]);

  function toggleGroup(label: string) {
    setOpenGroup((prev) => (prev === label ? null : label));
  }

  return (
    <aside className="sticky top-0 flex h-screen w-[280px] shrink-0 flex-col overflow-x-hidden overflow-y-auto border-r border-gray-200 bg-white">
      <div className="flex h-full w-[280px] shrink-0 flex-col p-4">
        <div className="fin-sidebar__profile">
          <div className="fin-sidebar__avatar">{initials}</div>
          <div>
            <div className="fin-sidebar__name">{userName}</div>
            <div className="fin-sidebar__plan">{companyName}</div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          <SimpleNavItem item={DASHBOARD} pathname={pathname} />

          {GROUPS.map((group) => {
            const isOpen = openGroup === group.label;
            const Icon = group.icon;
            return (
              <div
                key={group.label}
                className={cn(
                  "rounded-xl border p-1 transition-all duration-300",
                  isOpen ? "border-gray-200 bg-white shadow-sm" : "border-transparent",
                  openGroup && !isOpen && "opacity-45"
                )}
              >
                <button
                  type="button"
                  onClick={() => toggleGroup(group.label)}
                  aria-expanded={isOpen}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-xl border-l-[3px] px-3 py-2.5 text-sm font-medium transition-colors duration-300",
                    isOpen
                      ? "border-primary bg-accent text-primary ring-1 ring-primary/40"
                      : "border-transparent text-gray-600 hover:bg-gray-100"
                  )}
                >
                  <Icon size={18} className={isOpen ? "text-primary" : "text-gray-400"} />
                  <span className="flex-1 text-left">{group.label}</span>
                  <ChevronRight
                    size={16}
                    className={cn(
                      "shrink-0 transition-transform duration-500",
                      EASE,
                      isOpen ? "rotate-90 text-primary" : "text-gray-400"
                    )}
                  />
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

          <div className="mt-auto flex flex-col gap-1 border-t border-gray-200 pt-3">
            <div className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Outros</div>
            {OUTROS.map((item) => (
              <SimpleNavItem key={item.href} item={item} pathname={pathname} />
            ))}
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className={cn(
                "flex items-center gap-2 rounded-xl border-l-[3px] border-transparent px-3 py-2.5 text-left text-sm font-medium text-gray-600 transition-colors duration-300",
                loggingOut ? "cursor-not-allowed opacity-60" : "hover:bg-gray-100"
              )}
            >
              <LogOut size={18} className="text-gray-400" />
              <span className="flex-1 text-left">{loggingOut ? "Saindo..." : "Sair"}</span>
            </button>
          </div>
        </nav>
      </div>
    </aside>
  );
}

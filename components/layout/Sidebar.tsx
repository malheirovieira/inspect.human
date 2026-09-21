"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Users,
  Briefcase,
  UserSearch,
  GraduationCap,
  BarChart3,
  Clock,
  Wallet,
  FileText,
  Settings,
  HelpCircle,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
};

const MENU: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/colaboradores", label: "Colaboradores", icon: Users },
  { href: "/recrutamento/vagas", label: "Vagas", icon: Briefcase },
  { href: "/recrutamento/candidatos", label: "Candidatos", icon: UserSearch },
  { href: "/desenvolvimento/trilhas", label: "Trilhas", icon: GraduationCap },
  { href: "/desenvolvimento/progresso", label: "Progresso", icon: BarChart3 },
  { href: "/ponto", label: "Ponto", icon: Clock },
  { href: "/folha/variaveis", label: "Variáveis", icon: Wallet },
  { href: "/folha/relatorios", label: "Relatórios", icon: FileText },
];

const OUTROS: NavItem[] = [
  { href: "/configuracoes", label: "Configurações", icon: Settings },
  { href: "/ajuda", label: "Ajuda", icon: HelpCircle, disabled: true },
  { href: "/sair", label: "Sair", icon: LogOut, disabled: true },
];

function NavList({ items, pathname }: { items: NavItem[]; pathname: string }) {
  return (
    <>
      {items.map((item) => {
        const active = pathname.startsWith(item.href);
        const Icon = item.icon;
        if (item.disabled) {
          return (
            <span key={item.href} className="fin-sidebar__item fin-sidebar__item--locked">
              <span className="fin-sidebar__item-icon">
                <Icon size={18} />
              </span>
              <span style={{ flexGrow: 1 }}>{item.label}</span>
            </span>
          );
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn("fin-sidebar__item", active && "fin-sidebar__item--active")}
          >
            <span className="fin-sidebar__item-icon">
              <Icon size={18} />
            </span>
            <span style={{ flexGrow: 1 }}>{item.label}</span>
          </Link>
        );
      })}
    </>
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
  const initials = userName
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  return (
    <nav className="fin-sidebar">
      <div className="fin-sidebar__profile">
        <div className="fin-sidebar__avatar">{initials}</div>
        <div>
          <div className="fin-sidebar__name">{userName}</div>
          <div className="fin-sidebar__plan">{companyName}</div>
        </div>
      </div>
      <div className="fin-sidebar__group-label">Menu</div>
      <NavList items={MENU} pathname={pathname} />
      <div className="fin-sidebar__group-label">Outros</div>
      <NavList items={OUTROS} pathname={pathname} />
    </nav>
  );
}

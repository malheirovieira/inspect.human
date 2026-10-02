"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Briefcase,
  Building2,
  ChevronRight,
  ChevronsUpDown,
  Handshake,
  Home,
  KeyRound,
  LogOut,
  Settings,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  AnimatedSidebar,
  AnimatedSidebarClose,
  AnimatedSidebarContent,
  AnimatedSidebarFooter,
  AnimatedSidebarGroup,
  AnimatedSidebarGroupContent,
  AnimatedSidebarGroupLabel,
  AnimatedSidebarHeader,
  AnimatedSidebarInset,
  AnimatedSidebarMenu,
  AnimatedSidebarMenuButton,
  AnimatedSidebarMenuItem,
  AnimatedSidebarMenuSub,
  AnimatedSidebarMenuSubButton,
  AnimatedSidebarMenuSubItem,
  AnimatedSidebarProvider,
  AnimatedSidebarRail,
  useAnimatedSidebar,
} from "@/components/ui/animated-sidebar";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { UPCOMING_MODULES } from "@/lib/config/upcomingModules";
import { cn } from "@/lib/utils";

// Menu lateral (components/ui/animated-sidebar) + moldura do app. Visual
// neutro (branco/cinzas) pedido pelo usuário em 2026-10-02, igual à
// referência do componente — a paleta azul da marca continua no resto do
// sistema (cards, botões, gráficos).

const COLLAPSE_STORAGE_KEY = "inspect-talent:sidebar-collapsed";
// Chave do nome antigo do sistema (Inspect Human) — só lida pra migrar a
// preferência de quem já usava o sistema.
const LEGACY_COLLAPSE_STORAGE_KEY = "inspect-human:sidebar-collapsed";

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

type NavLeaf = { label: string; href?: string; description?: string };
type NavEntry = {
  label: string;
  icon: LucideIcon;
  // Sem href e sem children = módulo do roadmap (toast "Em desenvolvimento").
  href?: string;
  children?: NavLeaf[];
};

const TOP: NavEntry[] = [
  { label: "Início", icon: Home, href: "/dashboard" },
  { label: "Configurações", icon: Settings, href: "/configuracoes" },
];

// Módulos reais injetados em "Gestão de pessoas" (módulo do roadmap) —
// os demais sub-itens continuam vindo de lib/config/upcomingModules.ts.
const PEOPLE_REAL: NavLeaf[] = [
  { label: "Avaliações", href: "/avaliacoes" },
  { label: "Desligamentos", href: "/desligamentos" },
  { label: "Análise de Desligamentos", href: "/desligamentos/analise" },
];

const MODULES: NavEntry[] = [
  {
    label: "Recrutamento",
    icon: Briefcase,
    href: "/recrutamento",
    children: [
      { label: "Vagas", href: "/recrutamento/vagas" },
      { label: "Banco de Talentos", href: "/recrutamento/banco-de-talentos" },
    ],
  },
  ...UPCOMING_MODULES.map((module) => ({
    label: module.label,
    icon: module.icon,
    children: module.subModules
      ? [...(module.label === "Gestão de pessoas" ? PEOPLE_REAL : []), ...module.subModules]
      : undefined,
  })),
];

const SUPERADMIN: NavEntry[] = [
  { label: "Empresas", icon: Building2, href: "/admin/empresas" },
  { label: "Parceiros", icon: Handshake, href: "/admin/parceiros" },
];

// /desligamentos não pode acender quando a rota é /desligamentos/analise —
// o item mais específico vence.
function isLeafActive(pathname: string, href: string, siblings: NavLeaf[]): boolean {
  if (!(pathname === href || pathname.startsWith(`${href}/`))) return false;
  return !siblings.some(
    (s) => s.href && s.href !== href && s.href.startsWith(`${href}/`) && (pathname === s.href || pathname.startsWith(`${s.href}/`))
  );
}

function entryActive(pathname: string, entry: NavEntry): boolean {
  if (entry.href === "/dashboard") return pathname === "/dashboard";
  if (entry.href && (pathname === entry.href || pathname.startsWith(`${entry.href}/`))) return true;
  return (entry.children ?? []).some((c) => c.href && isLeafActive(pathname, c.href, entry.children ?? []));
}

function SoonBadge() {
  return <span className="text-[10px] font-medium uppercase tracking-wide text-neutral-400">Em breve</span>;
}

function NavGroup({
  entries,
  pathname,
  openSection,
  setOpenSection,
  onSoon,
}: {
  entries: NavEntry[];
  pathname: string;
  openSection: string | null;
  setOpenSection: (fn: (current: string | null) => string | null) => void;
  onSoon: (label: string) => void;
}) {
  return (
    <AnimatedSidebarMenu>
      {entries.map((entry) => {
        const Icon = entry.icon;
        const children = entry.children;
        const isSoonOnly = !entry.href && (!children || children.every((c) => !c.href));
        return (
          <AnimatedSidebarMenuItem key={entry.label}>
            <AnimatedSidebarMenuButton
              href={entry.href}
              isActive={entryActive(pathname, entry)}
              ariaExpanded={children ? openSection === entry.label : undefined}
              icon={<Icon className="size-4" />}
              badge={isSoonOnly && !children ? <SoonBadge /> : undefined}
              onSelect={() => {
                if (children) setOpenSection((current) => (current === entry.label ? null : entry.label));
                else if (!entry.href) onSoon(entry.label);
              }}
            >
              {entry.label}
            </AnimatedSidebarMenuButton>
            {children ? (
              <AnimatedSidebarMenuSub open={openSection === entry.label}>
                {children.map((child) => (
                  <AnimatedSidebarMenuSubItem key={child.label}>
                    <AnimatedSidebarMenuSubButton
                      href={child.href}
                      isActive={Boolean(child.href && isLeafActive(pathname, child.href, children))}
                      title={child.href ? undefined : `${child.description ?? child.label} — Em breve`}
                      closeOnSelect={Boolean(child.href)}
                      onSelect={child.href ? undefined : () => onSoon(child.label)}
                    >
                      {child.href ? (
                        child.label
                      ) : (
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate">{child.label}</span>
                          <SoonBadge />
                        </span>
                      )}
                    </AnimatedSidebarMenuSubButton>
                  </AnimatedSidebarMenuSubItem>
                ))}
              </AnimatedSidebarMenuSub>
            ) : null}
          </AnimatedSidebarMenuItem>
        );
      })}
    </AnimatedSidebarMenu>
  );
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

// Rodapé: perfil (igual à referência) — o clique abre um menu pequeno com
// Trocar senha / Sair (o "Sair" antes ficava solto no rodapé do menu).
function ProfileMenu({ userName, userEmail }: { userName: string; userEmail: string }) {
  const router = useRouter();
  const sidebar = useAnimatedSidebar();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function handleLogout() {
    setLoggingOut(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div ref={wrapperRef} className="relative">
      {open && (
        <div
          role="menu"
          className="absolute bottom-full left-0 right-0 z-30 mb-2 overflow-hidden rounded-xl border border-neutral-200 bg-white p-1 shadow-lg"
        >
          <Link
            role="menuitem"
            href="/trocar-senha"
            onClick={() => setOpen(false)}
            className="flex min-h-9 items-center gap-2.5 rounded-lg px-3 text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950"
          >
            <KeyRound className="size-4" />
            Trocar senha
          </Link>
          <button
            role="menuitem"
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex min-h-9 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950 disabled:opacity-60"
          >
            <LogOut className="size-4" />
            {loggingOut ? "Saindo..." : "Sair"}
          </button>
        </div>
      )}
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        title={sidebar.state === "collapsed" && !sidebar.isMobile ? userName : undefined}
        onClick={() => {
          // Na barra de ícones não cabe o menu: abre o painel primeiro.
          if (sidebar.state === "collapsed" && !sidebar.isMobile) sidebar.setOpen(true);
          setOpen((prev) => !prev);
        }}
        className="flex min-h-11 w-full items-center gap-3 overflow-hidden rounded-xl p-1 text-left outline-none transition-colors hover:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-neutral-400"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#d5ff66] text-xs font-semibold text-[#172000]">
          {initialsOf(userName)}
        </span>
        <span className="min-w-0 flex-1 group-data-[state=collapsed]/sidebar:hidden">
          <span className="block truncate text-sm font-medium text-neutral-950">{userName}</span>
          <span className="block truncate text-xs text-neutral-500">{userEmail}</span>
        </span>
        <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-neutral-500 group-data-[state=collapsed]/sidebar:hidden" />
      </button>
    </div>
  );
}

function AppSidebar({
  userName,
  userEmail,
  companyName,
  role,
}: {
  userName: string;
  userEmail: string;
  companyName: string;
  role?: string;
}) {
  const pathname = usePathname();
  const routeSection = MODULES.find((m) => m.children && entryActive(pathname, m))?.label ?? null;
  const [openSection, setOpenSectionState] = useState<string | null>(routeSection);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setOpenSectionState(routeSection);
  }, [routeSection]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  const isSuperAdmin = role === "SUPERADMIN";
  const companyHref = isSuperAdmin ? "/admin/empresas" : "/configuracoes";

  return (
    <AnimatedSidebar ariaLabel="Menu principal" collapsible="icon" className="min-h-0" panelClassName="h-full border-black/[0.08]">
      <AnimatedSidebarHeader className="p-3 pb-2">
        <div className="flex min-h-11 items-center gap-3 overflow-hidden px-2">
          <div className="grid size-7 shrink-0 place-items-center rounded-lg bg-neutral-950 text-xs font-semibold text-white">
            {initialsOf(companyName).slice(0, 1) || "I"}
          </div>
          <Link
            href={companyHref}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 group-data-[state=collapsed]/sidebar:hidden"
          >
            <span className="truncate text-sm font-semibold text-neutral-950">{companyName}</span>
            <ChevronsUpDown aria-hidden="true" className="size-3.5 shrink-0 text-neutral-500" />
          </Link>
          <AnimatedSidebarClose className="ml-auto text-neutral-500 hover:bg-neutral-100 md:hidden">
            <X aria-hidden="true" className="size-4" />
          </AnimatedSidebarClose>
        </div>
      </AnimatedSidebarHeader>

      <AnimatedSidebarContent className="px-2 pt-1">
        <AnimatedSidebarGroup className="pb-2">
          <AnimatedSidebarGroupContent>
            <NavGroup entries={TOP} pathname={pathname} openSection={openSection} setOpenSection={setOpenSectionState} onSoon={() => {}} />
          </AnimatedSidebarGroupContent>
        </AnimatedSidebarGroup>

        <AnimatedSidebarGroup className="pt-1">
          <AnimatedSidebarGroupLabel>Módulos</AnimatedSidebarGroupLabel>
          <AnimatedSidebarGroupContent>
            <NavGroup
              entries={MODULES}
              pathname={pathname}
              openSection={openSection}
              setOpenSection={setOpenSectionState}
              onSoon={(label) => setToast(`${label} — Em desenvolvimento`)}
            />
          </AnimatedSidebarGroupContent>
        </AnimatedSidebarGroup>

        {isSuperAdmin && (
          <AnimatedSidebarGroup className="pt-1">
            <AnimatedSidebarGroupLabel>Super admin</AnimatedSidebarGroupLabel>
            <AnimatedSidebarGroupContent>
              <NavGroup entries={SUPERADMIN} pathname={pathname} openSection={openSection} setOpenSection={setOpenSectionState} onSoon={() => {}} />
            </AnimatedSidebarGroupContent>
          </AnimatedSidebarGroup>
        )}
      </AnimatedSidebarContent>

      <AnimatedSidebarFooter className="gap-3 border-none p-3">
        <ProfileMenu userName={userName} userEmail={userEmail} />
      </AnimatedSidebarFooter>

      <AnimatedSidebarRail />

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 left-4 z-50 rounded-xl bg-neutral-950 px-4 py-2.5 text-sm font-medium text-white shadow-lg"
        >
          {toast}
        </div>
      )}
    </AnimatedSidebar>
  );
}

// Casco do app: sidebar à esquerda e a área da página rolando por dentro,
// ocupando a tela inteira — sem moldura/borda em volta da página (pedido
// do usuário, 2026-10-02: "essa borda não deve existir").
export function AppShell({
  children,
  userName,
  userEmail,
  companyName,
  role,
}: {
  children: ReactNode;
  userName: string;
  userEmail: string;
  companyName: string;
  role?: string;
}) {
  const [open, setOpenState] = useState(true);

  useEffect(() => {
    try {
      setOpenState(!readCollapsedPreference());
    } catch {
      // localStorage indisponível (modo privado etc.) — mantém aberto.
    }
  }, []);

  function setOpen(next: boolean) {
    setOpenState(next);
    try {
      localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? "0" : "1");
    } catch {
      // ignora falha de storage
    }
  }

  return (
    <div className="fin-shell h-svh bg-white">
      <AnimatedSidebarProvider
        open={open}
        onOpenChange={setOpen}
        className="fin-shell__frame h-full min-h-0 overflow-hidden bg-white"
      >
        <AppSidebar userName={userName} userEmail={userEmail} companyName={companyName} role={role} />
        <AnimatedSidebarInset className="fin-shell__main fin-main min-h-0 overflow-y-auto">{children}</AnimatedSidebarInset>
      </AnimatedSidebarProvider>
    </div>
  );
}

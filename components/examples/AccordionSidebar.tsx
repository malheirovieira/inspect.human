"use client";

/**
 * Componente de exemplo/referência — NÃO conectado ao app real.
 * Implementa o comportamento pedido: sidebar colapsável por largura,
 * acordeão de 2 níveis (categoria -> subcategoria -> itens) com o truque
 * de CSS Grid para animar altura, chevrons rotativos e fechamento ao
 * clicar fora. Dados abaixo são fake, só para demonstrar a estrutura.
 */

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Briefcase,
  GraduationCap,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type LeafItem = { id: string; label: string };
type Subcategory = { id: string; label: string; items: LeafItem[] };
type Category = { id: string; label: string; icon: LucideIcon; subcategories: Subcategory[] };

const EASE = "[transition-timing-function:cubic-bezier(0.22,1,0.36,1)]";

const CATEGORIES: Category[] = [
  {
    id: "recrutamento",
    label: "Recrutamento",
    icon: Briefcase,
    subcategories: [
      {
        id: "vagas",
        label: "Vagas",
        items: [
          { id: "vagas-abertas", label: "Vagas abertas" },
          { id: "vagas-encerradas", label: "Vagas encerradas" },
          { id: "modelos-vaga", label: "Modelos de vaga" },
        ],
      },
      {
        id: "candidatos",
        label: "Candidatos",
        items: [
          { id: "triagem", label: "Triagem" },
          { id: "entrevistas", label: "Entrevistas" },
          { id: "banco-talentos", label: "Banco de talentos" },
        ],
      },
    ],
  },
  {
    id: "desenvolvimento",
    label: "Desenvolvimento",
    icon: GraduationCap,
    subcategories: [
      {
        id: "trilhas",
        label: "Trilhas",
        items: [
          { id: "onboarding", label: "Trilha de onboarding" },
          { id: "lideranca", label: "Trilha de liderança" },
        ],
      },
      {
        id: "progresso",
        label: "Progresso",
        items: [
          { id: "por-colaborador", label: "Por colaborador" },
          { id: "por-equipe", label: "Por equipe" },
        ],
      },
    ],
  },
  {
    id: "configuracoes",
    label: "Configurações",
    icon: Settings,
    subcategories: [
      {
        id: "conta",
        label: "Conta",
        items: [
          { id: "perfil", label: "Perfil" },
          { id: "seguranca", label: "Segurança" },
        ],
      },
      {
        id: "empresa",
        label: "Empresa",
        items: [
          { id: "dados-cadastrais", label: "Dados cadastrais" },
          { id: "integracoes", label: "Integrações" },
        ],
      },
    ],
  },
];

export function AccordionSidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [openSubcategory, setOpenSubcategory] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<LeafItem | null>(null);

  const asideRef = useRef<HTMLElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);

  // Fecha a sidebar ao clicar fora dela, exceto no botão de toggle ou em
  // qualquer elemento marcado com data-sidebar-trigger (cards externos que
  // abrem a sidebar já num item específico, ver exemplo mais abaixo).
  useEffect(() => {
    if (!sidebarOpen) return;

    function handleMouseDown(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (target.closest("[data-sidebar-trigger]")) return;
      if (toggleRef.current?.contains(target)) return;
      if (asideRef.current && !asideRef.current.contains(target)) {
        setSidebarOpen(false);
      }
    }

    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [sidebarOpen]);

  function toggleCategory(id: string) {
    setOpenCategory((prev) => (prev === id ? null : id));
    setOpenSubcategory(null);
  }

  function toggleSubcategory(categoryId: string, subId: string) {
    const key = `${categoryId}/${subId}`;
    setOpenSubcategory((prev) => (prev === key ? null : key));
  }

  function openToItem(categoryId: string, subId: string) {
    setSidebarOpen(true);
    setOpenCategory(categoryId);
    setOpenSubcategory(`${categoryId}/${subId}`);
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* ---- Sidebar ---- */}
      <aside
        ref={asideRef}
        className={cn(
          "flex flex-col overflow-hidden bg-white transition-[width,opacity] duration-800 ease-in-out",
          sidebarOpen ? "w-[280px] opacity-100 border-r border-gray-200" : "w-0 opacity-0 border-r-0"
        )}
      >
        <div className="w-[280px] shrink-0 p-4">
          <h2 className="mb-4 px-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Menu
          </h2>

          <nav className="flex flex-col gap-1">
            {CATEGORIES.map((category) => {
              const isCategoryOpen = openCategory === category.id;
              const Icon = category.icon;

              return (
                <div
                  key={category.id}
                  className={cn(
                    "rounded-xl transition-opacity duration-300",
                    openCategory && !isCategoryOpen && "opacity-45"
                  )}
                >
                  {/* Nível 1: categoria */}
                  <button
                    type="button"
                    onClick={() => toggleCategory(category.id)}
                    aria-expanded={isCategoryOpen}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-xl border-l-[3px] px-3 py-2.5 text-sm font-medium transition-colors duration-300",
                      isCategoryOpen
                        ? "border-primary bg-accent text-primary ring-1 ring-primary/40"
                        : "border-transparent text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    <Icon size={18} className={isCategoryOpen ? "text-primary" : "text-gray-400"} />
                    <span className="flex-1 text-left">{category.label}</span>
                    <ChevronRight
                      size={16}
                      className={cn(
                        "shrink-0 transition-transform duration-500",
                        EASE,
                        isCategoryOpen ? "rotate-90 text-primary" : "text-gray-400"
                      )}
                    />
                  </button>

                  {/* Truque do grid: anima altura automática sem medir em JS */}
                  <div
                    className={cn(
                      "grid transition-[grid-template-rows,opacity] duration-500",
                      EASE,
                      isCategoryOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                    )}
                  >
                    <ul className="overflow-hidden pl-4 pt-1">
                      {category.subcategories.map((sub) => {
                        const subKey = `${category.id}/${sub.id}`;
                        const isSubOpen = openSubcategory === subKey;

                        return (
                          <li key={sub.id} className="py-0.5">
                            {/* Nível 2: subcategoria */}
                            <button
                              type="button"
                              onClick={() => toggleSubcategory(category.id, sub.id)}
                              aria-expanded={isSubOpen}
                              className={cn(
                                "flex w-full items-center gap-2 rounded-lg border-l-[3px] px-3 py-2 text-sm transition-colors duration-300",
                                isSubOpen
                                  ? "border-primary bg-accent text-primary ring-1 ring-primary/40"
                                  : "border-transparent text-gray-600 hover:bg-gray-100"
                              )}
                            >
                              <span className="flex-1 text-left">{sub.label}</span>
                              <ChevronRight
                                size={14}
                                className={cn(
                                  "shrink-0 transition-transform duration-500",
                                  EASE,
                                  isSubOpen ? "rotate-90 text-primary" : "text-gray-400"
                                )}
                              />
                            </button>

                            {/* Nível 3 (folha): itens/artigos, sem expandir */}
                            <div
                              className={cn(
                                "grid transition-[grid-template-rows,opacity] duration-500",
                                EASE,
                                isSubOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                              )}
                            >
                              <ul className="overflow-hidden pl-4 pt-1">
                                {sub.items.map((item) => (
                                  <li key={item.id}>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedItem(item)}
                                      className={cn(
                                        "w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors duration-300",
                                        selectedItem?.id === item.id
                                          ? "font-medium text-primary"
                                          : "text-gray-500 hover:text-gray-800"
                                      )}
                                    >
                                      {item.label}
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* ---- Conteúdo principal ---- */}
      <div className="flex flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-gray-200 p-4">
          <button
            ref={toggleRef}
            type="button"
            onClick={() => setSidebarOpen((prev) => !prev)}
            aria-label={sidebarOpen ? "Fechar menu" : "Abrir menu"}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:bg-gray-100"
          >
            {sidebarOpen ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
          </button>
          <span className="text-sm font-medium text-gray-500">
            {sidebarOpen ? "Menu aberto" : "Menu fechado"}
          </span>
        </div>

        <div className="flex-1 p-8">
          {/* key muda a cada seleção -> força remount -> reanima o fade-in */}
          <div key={selectedItem?.id ?? "empty"} className="animate-fade-in">
            {selectedItem ? (
              <>
                <h1 className="text-2xl font-semibold text-gray-900">{selectedItem.label}</h1>
                <p className="mt-2 text-sm text-gray-500">
                  Conteúdo de exemplo para &ldquo;{selectedItem.label}&rdquo;.
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-400">Selecione um item no menu à esquerda.</p>
            )}
          </div>

          {/* Cards de exemplo: hover elevado + chevron com nudge, e um
              data-sidebar-trigger para abrir a sidebar já na subcategoria
              certa sem disparar o fechamento por clique-fora. */}
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {CATEGORIES.flatMap((category) =>
              category.subcategories.map((sub) => ({ category, sub }))
            ).map(({ category, sub }) => (
              <button
                key={sub.id}
                type="button"
                data-sidebar-trigger
                onClick={() => openToItem(category.id, sub.id)}
                className="group flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div>
                  <span className="block text-xs uppercase tracking-wide text-gray-400">
                    {category.label}
                  </span>
                  <span className="text-sm font-medium text-gray-700">{sub.label}</span>
                </div>
                <ChevronRight
                  size={16}
                  className="text-gray-400 transition-transform group-hover:translate-x-0.5"
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

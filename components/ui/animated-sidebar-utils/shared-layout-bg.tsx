"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  forwardRef,
  useCallback,
  useState,
  type ElementType,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react";
import { SPRING_LAYOUT } from "./ease";
import { cn } from "@/lib/utils";

// Pílula de hover que desliza entre os itens de um menu (efeito "shared
// layout"). Reescrito aqui porque o arquivo original não veio com o
// componente da animated-sidebar. Segue o item sob o mouse medindo o
// PRIMEIRO filho do item (o botão), não o <li> inteiro — assim um submenu
// aberto não estica a pílula.

export interface SharedLayoutBgProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  // Recuo lateral da pílula, em px.
  inset?: number;
  pillClassName?: string;
  pillContainerClassName?: string;
  children?: ReactNode;
}

type PillRect = { top: number; height: number };

export const SharedLayoutBg = forwardRef<HTMLElement, SharedLayoutBgProps>(function SharedLayoutBg(
  { as: Tag = "div", inset = 0, pillClassName, pillContainerClassName, className, children, onMouseOver, onMouseLeave, ...props },
  ref
) {
  const reduce = useReducedMotion() ?? false;
  const [rect, setRect] = useState<PillRect | null>(null);

  const handleOver = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      onMouseOver?.(event);
      const list = event.currentTarget;
      const item = (event.target as HTMLElement).closest<HTMLElement>('[data-slot="sidebar-menu-item"]');
      // Só itens diretos desta lista (um submenu tem a própria lógica).
      if (!item || item.parentElement !== list) return;
      const target = item.firstElementChild as HTMLElement | null;
      if (!target) return;
      const listBox = list.getBoundingClientRect();
      const box = target.getBoundingClientRect();
      setRect({ top: box.top - listBox.top, height: box.height });
    },
    [onMouseOver]
  );

  const handleLeave = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      onMouseLeave?.(event);
      setRect(null);
    },
    [onMouseLeave]
  );

  // Dentro de <ul> o filho precisa ser <li> pra o HTML continuar válido.
  const PillTag = Tag === "ul" || Tag === "ol" ? motion.li : motion.span;

  return (
    <Tag {...props} ref={ref} className={cn("relative", className)} onMouseOver={handleOver} onMouseLeave={handleLeave}>
      <PillTag
        aria-hidden="true"
        role="presentation"
        initial={false}
        animate={rect ? { opacity: 1, y: rect.top, height: rect.height } : { opacity: 0 }}
        transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
        style={{ left: inset, right: inset }}
        className={cn("pointer-events-none absolute top-0 block list-none", pillContainerClassName)}
      >
        <span className={cn("block h-full w-full", pillClassName)} />
      </PillTag>
      {children}
    </Tag>
  );
});

"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

// Encaixa o conteúdo (card "Seu plano") FIXO no canto inferior direito a
// partir de 768px; abaixo disso fica no fluxo, no fim da página.
//
// Por que portal: as páginas ficam dentro do PageTransition, que anima
// `transform` — e um ancestral com transform faz o `position: fixed` se
// prender a ele em vez da tela. No <body>, o fixed é da tela de verdade.
// No SSR (e antes de hidratar) o conteúdo fica no fluxo; no desktop ele
// passa pro canto logo após carregar.
// Recebe `children` já renderizado pelo servidor (dado, não função).
const DESKTOP = "(min-width: 768px)";

export function CornerDock({ children }: { children: ReactNode }) {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP);
    const update = () => setDesktop(mq.matches);
    update();
    setPortalTarget(document.body);
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  if (portalTarget && desktop) {
    return createPortal(<div className="fin-corner-dock">{children}</div>, portalTarget);
  }
  return <div className="fin-corner-inline">{children}</div>;
}

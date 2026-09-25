"use client";

import { usePathname } from "next/navigation";

// Fundo ambiente (brilhos azuis suaves) — SÓ na tela Início (/dashboard).
//
// Fica no layout do dashboard, e não dentro da página, de propósito: as
// páginas são embrulhadas pelo PageTransition, que anima `transform` (e
// mantém translateY(0) no fim) — um ancestral com transform faz o
// `position: fixed` se prender a ele em vez da tela.
//
// Só na ÁREA DA PÁGINA (à direita da Sidebar, que é branca e opaca): este
// fundo é o PRIMEIRO filho do .fin-main, numa camada `sticky` do tamanho da
// tela (ocupa 0 de altura no fluxo), então acompanha a largura do menu
// aberto/recolhido e o scroll. Empilhamento sem z-index negativo:
// .fin-app tem `isolation: isolate` e o conteúdo (.fin-page-enter,
// posicionado) vem depois na árvore e pinta por cima. Estilos e cores em
// globals.css (seção "Fundo ambiente").
export function AmbientBackground() {
  const pathname = usePathname();
  if (pathname !== "/dashboard") return null;

  return (
    <div className="fin-ambient" aria-hidden="true">
      <div className="fin-ambient__glow fin-ambient__glow--lavender" />
      <div className="fin-ambient__glow fin-ambient__glow--main" />
      <div className="fin-ambient__glow fin-ambient__glow--top" />
    </div>
  );
}

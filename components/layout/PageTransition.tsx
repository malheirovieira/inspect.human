"use client";

import { usePathname } from "next/navigation";

// CSS puro (não framer-motion) de propósito: com Server Components/streaming,
// o HTML final pinta na tela antes do JS de uma lib de animação ter chance
// de aplicar o estado inicial — dá um "flash" do conteúdo em opacidade
// cheia antes de sumir e reaparecer animado. Uma classe CSS com
// animation-fill-mode "both" não tem essa corrida: o navegador já aplica o
// keyframe inicial (invisível) antes do primeiro paint, então nunca pisca.
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="fin-page-enter">
      {children}
    </div>
  );
}

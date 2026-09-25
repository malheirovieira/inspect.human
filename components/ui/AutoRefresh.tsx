"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Enquanto montado, faz poll em /api/analysis/[analysisId]/status a cada
// `intervalMs` para verificar se o status mudou de PROCESSING.
// Quando muda (DONE/FAILED/etc.), chama router.refresh() UMA única vez pra
// buscar o resultado completo — em vez de recarregar toda a página a cada tick.
// Custo: 1 query leve (só status + errorCode) vs. 7+ queries anteriores.
export function AutoRefresh({ analysisId, intervalMs = 10_000 }: { analysisId: string; intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    let id: ReturnType<typeof setTimeout>;
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/analysis/${encodeURIComponent(analysisId)}/status`);
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          if (data.status !== "PROCESSING") {
            // Status mudou: um único refresh para exibir o resultado.
            router.refresh();
            return; // para de agendar próxima verificação
          }
        }
        // Status ainda PROCESSING ou erro de rede → agenda próximo tick.
      } catch {
        // Falha de rede — não quebra; tenta de novo no próximo tick.
      }
      if (!cancelled) id = setTimeout(poll, intervalMs);
    }

    id = setTimeout(poll, intervalMs);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [analysisId, intervalMs, router]);
  return null;
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Recarrega os dados do servidor a cada `intervalMs` enquanto estiver
// montado — usado só enquanto algo está "Processando" em segundo plano.
export function AutoRefresh({ intervalMs = 10_000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);
  return null;
}

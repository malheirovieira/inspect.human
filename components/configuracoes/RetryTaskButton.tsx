"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { retryBackgroundTask } from "@/app/(dashboard)/configuracoes/tarefas/actions";

// Recebe só o id (dado serializável) — a action é importada aqui no client,
// nunca passada como prop por um Server Component.
export function RetryTaskButton({ taskId }: { taskId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
      <Button
        variant="secondary"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await retryBackgroundTask(taskId);
            if ("error" in result) setError(result.error);
          })
        }
      >
        {pending ? "Enviando..." : "Tentar novamente"}
      </Button>
      {error && <span style={{ fontSize: 12, color: "var(--danger)" }}>{error}</span>}
    </div>
  );
}

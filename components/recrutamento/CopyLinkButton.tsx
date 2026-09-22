"use client";

import { useState } from "react";
import { Copy, Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { copyToClipboard } from "@/lib/clipboard";

export function CopyLinkButton({ path }: { path: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

  async function handleCopy() {
    const url = `${window.location.origin}${path}`;
    setStatus((await copyToClipboard(url)) ? "copied" : "error");
    setTimeout(() => setStatus("idle"), 2000);
  }

  return (
    <Button type="button" variant="secondary" onClick={handleCopy}>
      {status === "copied" ? <Check size={14} /> : status === "error" ? <X size={14} /> : <Copy size={14} />}
      {status === "copied" ? "Link copiado" : status === "error" ? "Não foi possível copiar" : "Copiar link público"}
    </Button>
  );
}

"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { copyToClipboard } from "@/lib/clipboard";

export function TemporaryPasswordCard({
  email,
  temporaryPassword,
  onDismiss,
  dismissLabel = "Concluir",
}: {
  email: string;
  temporaryPassword: string;
  onDismiss: () => void;
  dismissLabel?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    setCopied(await copyToClipboard(temporaryPassword));
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 12, borderColor: "var(--action-primary)" }}>
      <span className="fin-eyebrow">ACESSO CRIADO</span>
      <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>
        Repasse essa senha manualmente pra <strong>{email}</strong> — ela só aparece aqui, uma única vez.
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <code
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: "var(--radius-md)",
            background: "var(--surface-muted)",
            fontSize: 15,
            letterSpacing: "0.05em",
            userSelect: "all",
          }}
        >
          {temporaryPassword}
        </code>
        <Button type="button" variant="secondary" onClick={handleCopy}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copiada" : "Copiar"}
        </Button>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Button type="button" variant="secondary" onClick={onDismiss}>
          {dismissLabel}
        </Button>
      </div>
    </Card>
  );
}

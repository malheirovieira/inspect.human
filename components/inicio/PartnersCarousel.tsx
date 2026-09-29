"use client";

import { useState } from "react";
import type { Partner } from "@prisma/client";
import { ChevronLeft, ChevronRight, Lock, X } from "lucide-react";

// Um banner largo por vez (não um grid de logos pequenos) — é um anúncio,
// não um selo de parceria. Altura fixa via .fin-partner-banner (globals.css,
// 120px desktop / 80px mobile — inline style não faz media query).
export function PartnersCarousel({ partners, canClose }: { partners: Partner[]; canClose: boolean }) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [index, setIndex] = useState(0);

  const visible = partners.filter((p) => !dismissed.includes(p.id));
  if (visible.length === 0) return null;

  const current = visible[Math.min(index, visible.length - 1)];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div className="fin-partner-banner" style={{ position: "relative", flex: 1, borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
          <a href={current.linkUrl} target="_blank" rel="noopener noreferrer" style={{ display: "block", width: "100%", height: "100%" }}>
            <img
              src={current.imageUrl}
              alt={current.name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </a>

          {canClose ? (
            <button
              type="button"
              onClick={() => setDismissed((prev) => [...prev, current.id])}
              title="Fechar"
              aria-label={`Fechar banner de ${current.name}`}
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                width: 28,
                height: 28,
                borderRadius: "var(--radius-full)",
                border: "none",
                background: "rgba(0, 0, 0, 0.4)",
                backdropFilter: "blur(4px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "var(--white)",
              }}
            >
              <X size={14} />
            </button>
          ) : (
            <span
              title="Fechar banners disponível nos planos pagos"
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                width: 28,
                height: 28,
                borderRadius: "var(--radius-full)",
                background: "rgba(0, 0, 0, 0.4)",
                backdropFilter: "blur(4px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--white)",
              }}
            >
              <Lock size={13} />
            </span>
          )}
        </div>

        {visible.length > 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => setIndex((i) => (i - 1 + visible.length) % visible.length)}
              aria-label="Banner anterior"
              style={{
                width: 32,
                height: 32,
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => setIndex((i) => (i + 1) % visible.length)}
              aria-label="Próximo banner"
              style={{
                width: 32,
                height: 32,
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {!canClose && (
        <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", margin: 0 }}>
          Fechar banners disponível nos planos pagos
        </p>
      )}
    </div>
  );
}

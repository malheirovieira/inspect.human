"use client";

import { useState } from "react";
import type { Partner } from "@prisma/client";
import { ChevronLeft, ChevronRight, Lock, X } from "lucide-react";

const ITEMS_PER_PAGE = 3;

// Carrossel simples (sem avanço automático nem drag — ver TestimonialsStrip
// pra essa sofisticação, não justificada aqui pra um conteúdo institucional
// que muda raramente). Plano gratuito não fecha os cards (padrão do
// negócio): mostra cadeado no lugar do X.
export function PartnersCarousel({ partners, canClose }: { partners: Partner[]; canClose: boolean }) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [page, setPage] = useState(0);

  const visible = partners.filter((p) => !dismissed.includes(p.id));
  if (visible.length === 0) return null;

  const totalPages = Math.ceil(visible.length / ITEMS_PER_PAGE);
  const currentItems = visible.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-muted)" }}>Parceiros de benefícios</span>
        {totalPages > 1 && (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              aria-label="Página anterior"
              style={{
                width: 32,
                height: 32,
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: page === 0 ? "default" : "pointer",
                opacity: page === 0 ? 0.4 : 1,
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              aria-label="Próxima página"
              style={{
                width: 32,
                height: 32,
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: page === totalPages - 1 ? "default" : "pointer",
                opacity: page === totalPages - 1 ? 0.4 : 1,
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        {currentItems.map((partner) => (
          <div
            key={partner.id}
            style={{
              position: "relative",
              padding: 16,
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border)",
              background: "var(--surface)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            {canClose ? (
              <button
                type="button"
                onClick={() => setDismissed((prev) => [...prev, partner.id])}
                title="Fechar"
                aria-label={`Fechar banner de ${partner.name}`}
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  width: 22,
                  height: 22,
                  borderRadius: "var(--radius-full)",
                  border: "none",
                  background: "var(--surface-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                }}
              >
                <X size={12} />
              </button>
            ) : (
              <span
                title="Disponível nos planos pagos"
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  width: 22,
                  height: 22,
                  borderRadius: "var(--radius-full)",
                  background: "var(--surface-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-muted)",
                }}
              >
                <Lock size={11} />
              </span>
            )}

            <a
              href={partner.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textDecoration: "none" }}
            >
              <img src={partner.imageUrl} alt={partner.name} style={{ height: 40, objectFit: "contain" }} />
              <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted)" }}>{partner.name}</span>
            </a>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPage(i)}
              aria-label={`Página ${i + 1}`}
              style={{
                width: 6,
                height: 6,
                borderRadius: "var(--radius-full)",
                border: "none",
                background: i === page ? "var(--ink)" : "var(--border)",
                cursor: "pointer",
                padding: 0,
              }}
            />
          ))}
        </div>
      )}

      {!canClose && (
        <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", margin: 0 }}>
          Fechar banners disponível nos planos pagos
        </p>
      )}
    </div>
  );
}

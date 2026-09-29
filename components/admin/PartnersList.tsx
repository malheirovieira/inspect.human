"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Partner } from "@prisma/client";
import { ArrowDown, ArrowUp, Eye, EyeOff, ExternalLink, ImageOff, Pencil } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { updatePartner, deletePartner, reorderPartners } from "@/app/actions/partners";
import { PartnerForm } from "./PartnerForm";

export function PartnersList({ partners }: { partners: Partner[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleToggleActive(partner: Partner) {
    setBusyId(partner.id);
    await updatePartner(partner.id, { active: !partner.active });
    setBusyId(null);
    router.refresh();
  }

  async function handleMove(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= partners.length) return;

    const ids = partners.map((p) => p.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];

    setBusyId(partners[index].id);
    await reorderPartners(ids);
    setBusyId(null);
    router.refresh();
  }

  if (partners.length === 0) {
    return (
      <EmptyState
        icon={ImageOff}
        title="Nenhum parceiro cadastrado ainda"
        description='Clique em "Novo Parceiro" para começar.'
      />
    );
  }

  return (
    <Card style={{ padding: 0 }}>
      {partners.map((partner, index) =>
        editingId === partner.id ? (
          <div key={partner.id} style={{ padding: 16, borderTop: index === 0 ? "none" : "1px solid var(--border)" }}>
            <PartnerForm partner={partner} onCancel={() => setEditingId(null)} onSaved={() => setEditingId(null)} />
          </div>
        ) : (
          <div
            key={partner.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "14px 20px",
              borderTop: index === 0 ? "none" : "1px solid var(--border)",
              opacity: partner.active ? 1 : 0.55,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <button
                type="button"
                onClick={() => handleMove(index, -1)}
                disabled={index === 0 || busyId === partner.id}
                aria-label="Mover para cima"
                style={{ background: "none", border: "none", cursor: index === 0 ? "default" : "pointer", padding: 0, color: "var(--text-muted)" }}
              >
                <ArrowUp size={14} />
              </button>
              <button
                type="button"
                onClick={() => handleMove(index, 1)}
                disabled={index === partners.length - 1 || busyId === partner.id}
                aria-label="Mover para baixo"
                style={{ background: "none", border: "none", cursor: index === partners.length - 1 ? "default" : "pointer", padding: 0, color: "var(--text-muted)" }}
              >
                <ArrowDown size={14} />
              </button>
            </div>

            <div
              style={{
                width: 64,
                height: 40,
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                background: "var(--surface)",
              }}
            >
              <img src={partner.imageUrl} alt={partner.name} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>{partner.name}</div>
              <a
                href={partner.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              >
                {partner.linkUrl}
                <ExternalLink size={11} style={{ flexShrink: 0 }} />
              </a>
            </div>

            <Badge tone={partner.active ? "success" : "primary"}>{partner.active ? "Ativo" : "Inativo"}</Badge>

            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleToggleActive(partner)}
                disabled={busyId === partner.id}
                title={partner.active ? "Desativar" : "Ativar"}
                style={{ padding: "6px 10px" }}
              >
                {partner.active ? <EyeOff size={14} /> : <Eye size={14} />}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditingId(partner.id)}
                title="Editar"
                style={{ padding: "6px 10px" }}
              >
                <Pencil size={14} />
              </Button>
              <DeleteButton
                variant="ghost"
                ariaLabel={`Excluir ${partner.name}`}
                confirmMessage={`Deseja realmente remover "${partner.name}"? Essa ação não pode ser desfeita.`}
                onConfirm={async () => {
                  const result = await deletePartner(partner.id);
                  if (!result.success) throw new Error(result.error);
                  router.refresh();
                }}
              />
            </div>
          </div>
        )
      )}
    </Card>
  );
}

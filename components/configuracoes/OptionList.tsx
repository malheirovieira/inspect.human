"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { createCompanyOption, deleteCompanyOption } from "@/app/(dashboard)/configuracoes/actions";
import type { OptionCategory } from "@/services/companyOptions";

type Option = { id: string; label: string };

export function OptionList({
  category,
  title,
  description,
  options,
}: {
  category: OptionCategory;
  title: string;
  description: string;
  options: Option[];
}) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await createCompanyOption(category, label);

    setSubmitting(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setLabel("");
    router.refresh();
  }

  async function handleDelete(optionId: string) {
    await deleteCompanyOption(optionId);
    router.refresh();
  }

  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 12, flex: "1 1 320px" }}>
      <div>
        <div className="fin-heading" style={{ marginBottom: 0 }}>
          {title}
        </div>
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>{description}</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {options.length === 0 && (
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "8px 0" }}>Nenhuma opção cadastrada.</p>
        )}
        {options.map((option, index) => (
          <div
            key={option.id}
            className="group"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 4px",
              borderTop: index === 0 ? "none" : "1px solid var(--border)",
            }}
          >
            <span style={{ fontSize: 13 }}>{option.label}</span>
            <button
              type="button"
              onClick={() => handleDelete(option.id)}
              aria-label={`Remover ${option.label}`}
              className="opacity-0 transition-opacity duration-200 group-hover:opacity-100"
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", display: "flex" }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={handleAdd} style={{ display: "flex", gap: 8 }}>
        <Input placeholder="Nova opção" value={label} onChange={(e) => setLabel(e.target.value)} />
        <Button type="submit" variant={submitting ? "disabled" : "secondary"} aria-label="Adicionar">
          <Plus size={14} />
        </Button>
      </form>
      {error && <span style={{ fontSize: 12, color: "var(--danger)" }}>{error}</span>}
    </Card>
  );
}

"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Partner } from "@prisma/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FieldLabel, Input } from "@/components/ui/Field";
import { FileDropzone } from "@/components/ui/FileDropzone";
import { createPartner, updatePartner } from "@/app/actions/partners";
import { uploadPartnerImage } from "@/app/actions/uploadPartnerImage";

// Form inline (padrão do projeto — nunca modal) usado tanto pra criar quanto
// editar: presença de `partner` decide o modo, igual InterviewForm.
export function PartnerForm({
  partner,
  onCancel,
  onSaved,
}: {
  partner?: Partner;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(partner?.name ?? "");
  const [linkUrl, setLinkUrl] = useState(partner?.linkUrl ?? "");
  const [imageUrl, setImageUrl] = useState(partner?.imageUrl ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(next: File | null) {
    setFile(next);
    if (!next) return;

    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.set("file", next);
    const result = await uploadPartnerImage(formData);
    setUploading(false);

    if (!result.success) {
      setError(result.error);
      setFile(null);
      return;
    }
    setImageUrl(result.url);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!imageUrl) {
      setError("Envie uma imagem antes de salvar.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const result = partner
      ? await updatePartner(partner.id, { name, linkUrl, imageUrl })
      : await createPartner({ name, linkUrl, imageUrl });

    setSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }

    router.refresh();
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <span className="fin-eyebrow">{partner ? "EDITAR PARCEIRO" : "NOVO PARCEIRO"}</span>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          <FieldLabel label="Nome do parceiro" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Empresa Parceira" required />
          </FieldLabel>
          <FieldLabel label="URL do site" required>
            <Input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://..."
              required
            />
          </FieldLabel>
        </div>

        <FieldLabel label="Imagem (logo)" required>
          {imageUrl && !file ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <img
                src={imageUrl}
                alt="Preview"
                style={{ height: 40, maxWidth: 160, objectFit: "contain", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: 4 }}
              />
              <Button type="button" variant="secondary" onClick={() => setImageUrl("")}>
                Trocar imagem
              </Button>
            </div>
          ) : (
            <FileDropzone
              file={file}
              onFileChange={handleFileChange}
              accept="image/jpeg,image/png,image/webp,image/svg+xml"
              hint="JPG, PNG, WebP ou SVG, até 2MB"
              disabled={uploading || submitting}
            />
          )}
        </FieldLabel>

        {error && <span className="fin-field-error">{error}</span>}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" variant={submitting || uploading ? "disabled" : "confirm"}>
            {submitting ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </Card>
    </form>
  );
}

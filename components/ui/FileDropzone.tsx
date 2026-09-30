"use client";

import { useId, useRef, useState, type DragEvent } from "react";
import { FileText, UploadCloud, X } from "lucide-react";

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

// Área de upload do design system (substitui o <input type="file"> padrão
// do navegador): arrastar o arquivo ou clicar pra escolher; mostra nome e
// tamanho do arquivo selecionado, com "×" (vermelho) pra tirar. A validação
// de tipo/tamanho continua no servidor — `accept` aqui só filtra a janela.
export function FileDropzone({
  file,
  onFileChange,
  accept = "application/pdf",
  hint = "PDF, até 5MB",
  disabled,
}: {
  file: File | null;
  onFileChange: (file: File | null) => void;
  accept?: string;
  hint?: string;
  disabled?: boolean;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function pick(files: FileList | null) {
    onFileChange(files?.[0] ?? null);
  }

  function onDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragOver(false);
    if (!disabled) pick(e.dataTransfer.files);
  }

  if (file) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          width: "100%",
          padding: "12px 14px",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border)",
          background: "var(--surface)",
          textAlign: "left",
        }}
      >
        <FileText size={18} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {file.name}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{formatSize(file.size)}</div>
        </div>
        <button
          type="button"
          onClick={() => {
            onFileChange(null);
            if (inputRef.current) inputRef.current.value = "";
          }}
          disabled={disabled}
          aria-label="Remover arquivo selecionado"
          className="fin-icon-danger"
          style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 4 }}
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <label
      htmlFor={inputId}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        width: "100%",
        padding: "22px 16px",
        borderRadius: "var(--radius-md)",
        border: `1.5px dashed ${dragOver ? "var(--accent)" : "var(--tertiary-label)"}`,
        background: dragOver ? "var(--accent-surface)" : "var(--surface-muted)",
        cursor: disabled ? "not-allowed" : "pointer",
        textAlign: "center",
        transition: "background 0.15s ease, border-color 0.15s ease",
      }}
    >
      <UploadCloud size={22} style={{ color: "var(--text-muted)" }} />
      <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
        Arraste o arquivo aqui ou <span style={{ color: "var(--accent)", textDecoration: "underline" }}>clique para escolher</span>
      </span>
      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{hint}</span>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={(e) => pick(e.target.files)}
        style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
      />
    </label>
  );
}

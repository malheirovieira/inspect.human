"use client";

import { Search, X } from "lucide-react";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// Campo de busca com o visual "pílula + sublinhado animado no foco + botão
// de limpar" (referência: Uiverse.io, by satyamchaudharydev). Estilos em
// app/globals.css sob o prefixo .fin-search — width/height são CSS vars
// (--width-of-input/--height-of-input) pra cada tela poder ajustar sem
// duplicar a folha de estilo.
export function SearchInput({
  value,
  onChange,
  placeholder,
  width,
  height,
  className,
  inputProps,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  width?: number | string;
  height?: number | string;
  className?: string;
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
}) {
  return (
    <form
      className={cn("fin-search", className)}
      style={{
        ...(width != null ? { ["--width-of-input" as string]: typeof width === "number" ? `${width}px` : width } : {}),
        ...(height != null ? { ["--height-of-input" as string]: typeof height === "number" ? `${height}px` : height } : {}),
      }}
      onSubmit={(e) => e.preventDefault()}
      onReset={() => onChange("")}
    >
      <button type="button" tabIndex={-1} aria-hidden="true">
        <Search size={16} />
      </button>
      <input
        {...inputProps}
        className="fin-search__input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type="text"
      />
      <button type="reset" className="fin-search__reset" aria-label="Limpar busca">
        <X size={16} />
      </button>
    </form>
  );
}

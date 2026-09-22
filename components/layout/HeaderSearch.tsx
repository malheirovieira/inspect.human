"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SearchInput } from "@/components/ui/SearchInput";
import type { SearchResponse, SearchResultItem } from "@/app/api/search/route";

const GROUP_LABELS: Record<keyof SearchResponse, string> = {
  colaboradores: "Colaboradores",
  vagas: "Vagas",
  candidatos: "Candidatos",
};

export function HeaderSearch({ placeholder }: { placeholder: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults(null);
      setOpen(false);
      return;
    }

    setLoading(true);
    const timeout = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(trimmed)}`)
        .then((res) => (res.ok ? (res.json() as Promise<SearchResponse>) : null))
        .then((data) => {
          if (data) {
            setResults(data);
            setOpen(true);
          }
        })
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const groups = results
    ? (Object.keys(GROUP_LABELS) as (keyof SearchResponse)[])
        .map((key) => ({ key, label: GROUP_LABELS[key], items: results[key] }))
        .filter((group) => group.items.length > 0)
    : [];

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder={placeholder}
        inputProps={{ onFocus: () => results && setOpen(true) }}
      />
      {open && (
        <div
          className="rounded-lg border border-[var(--border)] bg-white"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            width: 320,
            maxHeight: 360,
            overflowY: "auto",
            boxShadow: "var(--shadow-sm)",
            zIndex: 30,
          }}
        >
          {loading ? (
            <p style={{ padding: "12px 16px", fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Buscando…</p>
          ) : groups.length === 0 ? (
            <p style={{ padding: "12px 16px", fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
              Nenhum resultado encontrado.
            </p>
          ) : (
            groups.map((group) => (
              <div key={group.key} className="border-b border-[var(--border)] last:border-b-0" style={{ padding: "8px 0" }}>
                <div style={{ padding: "4px 16px", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
                  {group.label}
                </div>
                {group.items.map((item: SearchResultItem) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="block hover:bg-[var(--surface-muted)]"
                    style={{ padding: "8px 16px" }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{item.label}</div>
                    {item.sublabel && (
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{item.sublabel}</div>
                    )}
                  </Link>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

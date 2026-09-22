"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/Field";
import { SearchInput } from "@/components/ui/SearchInput";

type FilterOption = { value: string; label: string };
type FilterConfig = { key: string; label: string; options: FilterOption[] };

export function ListToolbar({
  searchPlaceholder,
  filters = [],
}: {
  searchPlaceholder: string;
  filters?: FilterConfig[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  // Busca com debounce — evita navegar a cada tecla digitada.
  useEffect(() => {
    const currentQ = searchParams.get("q") ?? "";
    if (query === currentQ) return;
    const timeout = setTimeout(() => updateParam("q", query), 350);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "nowrap", alignItems: "center", overflowX: "auto" }}>
      <SearchInput value={query} onChange={setQuery} placeholder={searchPlaceholder} width={360} className="shrink-0" />
      {filters.map((filter) => (
        <Select
          key={filter.key}
          value={searchParams.get(filter.key) ?? ""}
          onChange={(e) => updateParam(filter.key, e.target.value)}
          style={{ flexShrink: 0, width: 180 }}
        >
          <option value="">{filter.label}</option>
          {filter.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      ))}
    </div>
  );
}

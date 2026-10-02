import { describe, expect, it } from "vitest";
import { buildCategorySeries } from "@/lib/desligamentos/chartSeries";

describe("buildCategorySeries", () => {
  it("mantém contagem e % originais e calcula a participação nas menções", () => {
    const rows = buildCategorySeries([
      { category: "A", count: 3, pct: 60 },
      { category: "B", count: 1, pct: 20 },
    ]);
    expect(rows).toEqual([
      { category: "A", count: 3, pct: 60, share: 75, otherCategories: 0 },
      { category: "B", count: 1, pct: 20, share: 25, otherCategories: 0 },
    ]);
  });

  it("a soma das participações é sempre 100%, mesmo com % de respondentes passando de 100", () => {
    const rows = buildCategorySeries([
      { category: "A", count: 8, pct: 80 },
      { category: "B", count: 7, pct: 70 },
    ]);
    const totalShare = rows.reduce((sum, r) => sum + r.share, 0);
    expect(totalShare).toBeCloseTo(100);
  });

  it("agrupa a cauda em 'Outros' preservando o total de menções", () => {
    const items = Array.from({ length: 10 }, (_, i) => ({ category: `C${i}`, count: 10 - i, pct: null }));
    const rows = buildCategorySeries(items, 8);
    expect(rows).toHaveLength(8);
    const outros = rows[rows.length - 1];
    expect(outros.category).toBe("Outros");
    expect(outros.otherCategories).toBe(3);
    expect(outros.pct).toBeNull();
    const total = rows.reduce((sum, r) => sum + r.count, 0);
    expect(total).toBe(items.reduce((sum, r) => sum + r.count, 0));
  });

  it("ignora categorias zeradas e devolve vazio sem dados", () => {
    expect(buildCategorySeries([{ category: "A", count: 0, pct: 0 }])).toEqual([]);
    expect(buildCategorySeries([])).toEqual([]);
  });
});

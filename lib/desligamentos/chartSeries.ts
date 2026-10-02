// Série única usada pelas DUAS visualizações (barra e pizza) de um gráfico
// de categoria — garante que alternar o tipo de gráfico nunca muda os
// números, só o desenho. Não recalcula nada da análise: só reorganiza o que
// computePeriodMetrics já entregou.
//
// O valor desenhado é sempre a CONTAGEM (aditiva), não o %: em campos
// multi-seleção (desafio, sugestão) os % de respondentes somam mais de 100,
// o que não cabe numa pizza. O % de respondentes continua no tooltip.

export type CategoryInput = { category: string; count: number; pct: number | null };

export type CategorySeriesRow = {
  category: string;
  count: number;
  // % sobre a base da análise (respondentes ou desligamentos) — null no
  // agrupamento "Outros", onde somar % de categorias multi-seleção não faz
  // sentido.
  pct: number | null;
  // % sobre o total de menções desenhadas — é o que a fatia da pizza mostra.
  share: number;
  otherCategories: number;
};

export function buildCategorySeries(items: CategoryInput[], maxItems = 8): CategorySeriesRow[] {
  const sorted = [...items].filter((i) => i.count > 0).sort((a, b) => b.count - a.count);
  const totalMentions = sorted.reduce((sum, i) => sum + i.count, 0);
  if (totalMentions === 0) return [];

  const visible = sorted.length > maxItems ? sorted.slice(0, maxItems - 1) : sorted;
  const rest = sorted.length > maxItems ? sorted.slice(maxItems - 1) : [];

  const rows: CategorySeriesRow[] = visible.map((i) => ({
    category: i.category,
    count: i.count,
    pct: i.pct,
    share: (i.count / totalMentions) * 100,
    otherCategories: 0,
  }));

  if (rest.length > 0) {
    const restCount = rest.reduce((sum, i) => sum + i.count, 0);
    rows.push({
      category: "Outros",
      count: restCount,
      pct: null,
      share: (restCount / totalMentions) * 100,
      otherCategories: rest.length,
    });
  }

  return rows;
}

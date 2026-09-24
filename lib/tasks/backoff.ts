// Espera crescente entre tentativas: 30s × 4^(n−1), teto de 1h, ±20% de
// variação (evita que várias tarefas que falharam juntas voltem juntas).
// n=1 → ~30s, 2 → ~2min, 3 → ~8min, 4 → ~32min, 5+ → ~1h.
export const BACKOFF_BASE_MS = 30_000;
export const BACKOFF_MAX_MS = 60 * 60_000;
const JITTER = 0.2;

export function computeBackoffMs(n: number, random: () => number = Math.random): number {
  const exp = Math.max(0, n - 1);
  const raw = Math.min(BACKOFF_BASE_MS * 4 ** exp, BACKOFF_MAX_MS);
  const factor = 1 - JITTER + random() * JITTER * 2;
  return Math.round(raw * factor);
}

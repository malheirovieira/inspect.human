import { createHash, timingSafeEqual } from "node:crypto";

export type CronAuthResult = "ok" | "unauthorized" | "not-configured";

// Confere `Authorization: Bearer <CRON_SECRET>` em tempo constante. Sem
// segredo configurado a rota fica FECHADA (not-configured → 503), nunca
// aberta. Compara os hashes pra timingSafeEqual não vazar o tamanho.
export function checkCronAuth(authorizationHeader: string | null, secret: string | undefined): CronAuthResult {
  if (!secret) return "not-configured";
  if (!authorizationHeader?.startsWith("Bearer ")) return "unauthorized";

  const given = createHash("sha256").update(authorizationHeader.slice("Bearer ".length)).digest();
  const expected = createHash("sha256").update(secret).digest();
  return timingSafeEqual(given, expected) ? "ok" : "unauthorized";
}

// Utilitários de "competência" (mês de referência, formato "YYYY-MM") —
// usados pelo seletor de mês da tela de KPIs. Extraído de schemas/budget.ts
// quando o módulo de orçamento foi removido (o conceito de competência não
// é exclusivo de budget).

export function competenceToDate(competence: string): Date {
  return new Date(`${competence}-01T00:00:00Z`);
}

export function dateToCompetence(date: Date): string {
  return date.toISOString().slice(0, 7);
}

export function currentCompetence(): string {
  return dateToCompetence(new Date());
}

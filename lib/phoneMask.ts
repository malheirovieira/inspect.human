// Formata telefone brasileiro enquanto digita: (XX) XXXX-XXXX (fixo, 10
// dígitos) ou (XX) XXXXX-XXXX (celular, 11 dígitos) — decide sozinho pelo
// tanto de dígitos já digitados.
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

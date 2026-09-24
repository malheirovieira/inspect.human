import { redirect } from "next/navigation";

// Rota antiga (renomeada pra "Banco de Talentos") — preserva os filtros da
// URL pra quem tinha um link salvo.
export default async function CandidatosRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams(params).toString();
  redirect(`/recrutamento/banco-de-talentos${query ? `?${query}` : ""}`);
}

import { redirect } from "next/navigation";

// Rota antiga (renomeada pra "Banco de Talentos") — mantém links salvos
// (ex.: notificações antigas) funcionando.
export default async function CandidatoRedirectPage({ params }: { params: Promise<{ candidateId: string }> }) {
  const { candidateId } = await params;
  redirect(`/recrutamento/banco-de-talentos/${candidateId}`);
}

import { prisma } from "@/lib/prisma";
import { ExitSurveyForm } from "@/components/pesquisaSaida/ExitSurveyForm";

interface PageProps {
  params: { token: string };
}

type ExitSurveyData = {
  department: string | null;
  admissionDate: string | null;
  exitDate: string;
};

// Mesmo padrão de app/avaliacao/[token]/page.tsx: Prisma direto (não
// self-fetch), nunca pede de novo o que já é conhecido do EmployeeExit
// (setor, admissão, data de saída) — só mostra, não deixa editar.
async function loadSurvey(token: string): Promise<ExitSurveyData | null> {
  const response = await prisma.exitSurveyResponse.findUnique({
    where: { token },
    include: { employeeExit: { select: { department: true, admissionDate: true, exitDate: true } } },
  });
  if (!response) return null;
  if (response.submittedAt || response.expiresAt < new Date()) return null;

  return {
    department: response.employeeExit.department,
    admissionDate: response.employeeExit.admissionDate ? response.employeeExit.admissionDate.toISOString() : null,
    exitDate: response.employeeExit.exitDate.toISOString(),
  };
}

export default async function PesquisaSaidaPage({ params }: PageProps) {
  const data = await loadSurvey(params.token);

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <h1 className="text-xl font-bold text-gray-900 mb-2">Link inválido</h1>
            <p className="text-gray-600">
              O link da pesquisa não foi encontrado, expirou ou já foi respondido.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow p-8">
          <ExitSurveyForm data={data} token={params.token} />
        </div>
      </div>
    </div>
  );
}

export const metadata = {
  title: "Pesquisa de Desligamento - Inspect Talent",
};

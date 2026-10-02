import { CheckCircle2 } from "lucide-react";

export default function ExitSurveySucessoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center px-4 py-8">
      <div className="max-w-lg w-full">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="flex justify-center mb-6">
            <CheckCircle2 className="w-16 h-16 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Pesquisa enviada!</h1>
          <p className="text-gray-600">Obrigado por compartilhar sua opinião. Ela é muito importante para nós.</p>
          <p className="text-xs text-gray-400 mt-6">Você pode fechar esta janela.</p>
        </div>
      </div>
    </div>
  );
}

export const metadata = {
  title: "Pesquisa enviada - Inspect Talent",
};

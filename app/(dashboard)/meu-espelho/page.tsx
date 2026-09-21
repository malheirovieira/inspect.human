import { Header } from "@/components/layout/Header";
import { EmptyState } from "@/components/ui/EmptyState";
import { FileClock } from "lucide-react";

export default function MeuEspelhoPage() {
  return (
    <>
      <Header eyebrow="PONTO" title="Espelho de Ponto" />
      <div className="fin-content">
        <EmptyState
          icon={FileClock}
          title="Nenhum registro ainda"
          description="O espelho de ponto com o histórico de entradas e saídas aparece aqui assim que houver registros."
        />
      </div>
    </>
  );
}

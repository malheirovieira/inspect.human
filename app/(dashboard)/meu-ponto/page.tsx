import { Header } from "@/components/layout/Header";
import { EmptyState } from "@/components/ui/EmptyState";
import { Clock } from "lucide-react";

export default function MeuPontoPage() {
  return (
    <>
      <Header eyebrow="PONTO" title="Meu Ponto" />
      <div className="fin-content">
        <EmptyState
          icon={Clock}
          title="Registro de ponto em breve"
          description="O botão de bater ponto e o histórico do dia ainda estão sendo desenvolvidos."
        />
      </div>
    </>
  );
}

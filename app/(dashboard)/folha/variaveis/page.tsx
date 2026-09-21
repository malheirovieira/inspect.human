import { Header } from "@/components/layout/Header";
import { EmptyState } from "@/components/ui/EmptyState";
import { Wallet } from "lucide-react";

export default function VariaveisPage() {
  return (
    <>
      <Header eyebrow="FOLHA" title="Variáveis" />
      <div className="fin-content">
        <EmptyState
          icon={Wallet}
          title="Nenhuma variável lançada"
          description="O lançamento de variáveis de folha (horas extras, faltas, comissões) ainda está sendo desenvolvido."
        />
      </div>
    </>
  );
}

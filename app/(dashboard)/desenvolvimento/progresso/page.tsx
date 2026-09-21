import { Header } from "@/components/layout/Header";
import { EmptyState } from "@/components/ui/EmptyState";
import { BarChart3 } from "lucide-react";

export default function ProgressoPage() {
  return (
    <>
      <Header eyebrow="DESENVOLVIMENTO" title="Progresso" />
      <div className="fin-content">
        <EmptyState
          icon={BarChart3}
          title="Sem progresso para exibir"
          description="O acompanhamento de progresso por colaborador aparece aqui assim que houver trilhas atribuídas."
        />
      </div>
    </>
  );
}

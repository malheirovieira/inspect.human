import { Header } from "@/components/layout/Header";
import { EmptyState } from "@/components/ui/EmptyState";
import { FileText } from "lucide-react";

export default function FolhaRelatoriosPage() {
  return (
    <>
      <Header eyebrow="FOLHA" title="Relatórios" />
      <div className="fin-content">
        <EmptyState
          icon={FileText}
          title="Nenhum relatório disponível"
          description="A exportação de relatórios de folha por competência ainda está sendo desenvolvida."
        />
      </div>
    </>
  );
}

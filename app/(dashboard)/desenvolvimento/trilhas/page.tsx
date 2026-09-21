import { Header } from "@/components/layout/Header";
import { EmptyState } from "@/components/ui/EmptyState";
import { GraduationCap } from "lucide-react";

export default function TrilhasPage() {
  return (
    <>
      <Header eyebrow="DESENVOLVIMENTO" title="Trilhas" />
      <div className="fin-content">
        <EmptyState
          icon={GraduationCap}
          title="Nenhuma trilha criada"
          description="A criação de trilhas de treinamento e atribuição a colaboradores ainda está sendo desenvolvida."
        />
      </div>
    </>
  );
}

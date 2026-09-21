import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { EmptyState } from "@/components/ui/EmptyState";
import { CandidateDadosForm } from "@/components/recrutamento/CandidateDadosForm";
import { CandidateTimeline } from "@/components/recrutamento/CandidateTimeline";
import { CandidateNotes } from "@/components/recrutamento/CandidateNotes";
import { getCandidate } from "@/services/candidates";
import type { ProcessTimeline } from "@/schemas/candidate";
import { FileText, Folder, Boxes } from "lucide-react";

const TABS = [
  { key: "dados", label: "Dados" },
  { key: "curriculo", label: "Currículo" },
  { key: "processo", label: "Processo" },
  { key: "documentos", label: "Documentos" },
  { key: "erp", label: "ERP" },
] as const;

export default async function CandidatoPerfilPage({
  params,
  searchParams,
}: {
  params: Promise<{ candidateId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { candidateId } = await params;
  const { tab } = await searchParams;
  const activeTab = TABS.some((t) => t.key === tab) ? tab! : "dados";

  const candidate = await getCandidate(candidateId);
  if (!candidate) notFound();

  return (
    <>
      <Header
        title={candidate.name}
        backHref="/recrutamento/candidatos"
        breadcrumb={[
          { label: "Recrutamento" },
          { label: "Candidatos", href: "/recrutamento/candidatos" },
          { label: candidate.name },
        ]}
      />
      <div className="fin-content">
        <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border)" }}>
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/recrutamento/candidatos/${candidateId}?tab=${t.key}`}
              style={{
                padding: "10px 16px",
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
                color: activeTab === t.key ? "var(--action-primary-text)" : "var(--text-muted)",
                borderBottom: activeTab === t.key ? "2px solid var(--action-primary)" : "2px solid transparent",
              }}
            >
              {t.label}
            </Link>
          ))}
        </div>

        {activeTab === "dados" && (
          <CandidateDadosForm
            candidateId={candidate.id}
            stage={candidate.stage as "TRIAGE" | "INTERVIEW" | "PROPOSAL" | "HIRED"}
            tag={candidate.qualificationTag as "GREEN" | "YELLOW" | "BLUE" | "RED" | "GRAY" | null}
            initial={{
              name: candidate.name,
              email: candidate.email,
              phone: candidate.phone ?? "",
              linkedinUrl: candidate.linkedinUrl ?? "",
            }}
          />
        )}

        {activeTab === "processo" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <CandidateTimeline
              candidateId={candidate.id}
              timeline={(candidate.processSteps as ProcessTimeline | null) ?? {}}
            />
            <CandidateNotes candidateId={candidate.id} notes={candidate.notes} />
          </div>
        )}

        {activeTab === "curriculo" && (
          <EmptyState
            icon={FileText}
            title="Upload de currículo em breve"
            description="O envio e a visualização do currículo em PDF ainda estão sendo desenvolvidos."
          />
        )}

        {activeTab === "documentos" && (
          <EmptyState
            icon={Folder}
            title="Nenhum documento anexado"
            description="O upload de documentos do candidato ainda está sendo desenvolvido."
          />
        )}

        {activeTab === "erp" && (
          <EmptyState
            icon={Boxes}
            title="Integração com ERP"
            description="Nenhuma integração configurada ainda."
          />
        )}
      </div>
    </>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { CandidateDadosForm } from "@/components/recrutamento/CandidateDadosForm";
import { CandidateTimeline } from "@/components/recrutamento/CandidateTimeline";
import { CandidateNotes } from "@/components/recrutamento/CandidateNotes";
import { getCandidate } from "@/services/candidates";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ProcessTimeline } from "@/schemas/candidate";
import { FileText, Folder, Boxes, Download } from "lucide-react";

const RESUME_BUCKET = "resumes";

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

  // URL assinada e de curta duração — o bucket é privado, então o link de
  // download só funciona por um tempo curto em vez de ficar público pra
  // sempre (o path em si já é isolado por company_id/candidate_id). Só
  // gera quando a aba Currículo está de fato aberta, pra não bater no
  // Storage à toa nas outras abas.
  let resumeUrl: string | null = null;
  if (activeTab === "curriculo" && candidate.resumePath) {
    const supabaseAdmin = createSupabaseAdminClient();
    const { data } = await supabaseAdmin.storage.from(RESUME_BUCKET).createSignedUrl(candidate.resumePath, 300);
    resumeUrl = data?.signedUrl ?? null;
  }

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

        {activeTab === "curriculo" &&
          (resumeUrl ? (
            <div className="fin-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <FileText size={18} style={{ color: "var(--text-muted)" }} />
                <span style={{ fontSize: 14, fontWeight: 500 }}>Currículo enviado na candidatura</span>
              </div>
              <a href={resumeUrl} target="_blank" rel="noreferrer">
                <Button variant="secondary">
                  <Download size={14} /> Baixar PDF
                </Button>
              </a>
            </div>
          ) : (
            <EmptyState
              icon={FileText}
              title="Nenhum currículo enviado"
              description="Este candidato não anexou um PDF de currículo na candidatura."
            />
          ))}

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

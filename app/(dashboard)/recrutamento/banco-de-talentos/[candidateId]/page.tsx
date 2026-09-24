import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CandidateProfileForm } from "@/components/recrutamento/CandidateProfileForm";
import { CandidateResumeUpload } from "@/components/recrutamento/CandidateResumeUpload";
import { getPerson } from "@/services/candidates";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { STAGE_LABELS, TERMINAL_STAGES, type CANDIDATE_STAGES } from "@/schemas/candidate";
import { FileText, Folder, Download } from "lucide-react";

const RESUME_BUCKET = "resumes";

const TABS = [
  { key: "perfil", label: "Perfil" },
  { key: "candidaturas", label: "Candidaturas" },
  { key: "documentos", label: "Documentos" },
] as const;

function resultLabel(stage: string): string {
  if (stage === "HIRED") return "Contratado";
  if (stage === "REJECTED") return "Reprovado";
  return "Em andamento";
}

export default async function PessoaPerfilPage({
  params,
  searchParams,
}: {
  params: Promise<{ candidateId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { candidateId } = await params;
  const { tab } = await searchParams;
  const activeTab = TABS.some((t) => t.key === tab) ? tab! : "perfil";

  const candidate = await getPerson(candidateId);
  if (!candidate) notFound();

  // URL assinada e de curta duração — o bucket é privado, então o link de
  // download só funciona por um tempo curto em vez de ficar público pra
  // sempre. Só gera quando a aba Perfil está de fato aberta.
  let resumeUrl: string | null = null;
  if (activeTab === "perfil" && candidate.resumePath) {
    const supabaseAdmin = createSupabaseAdminClient();
    const { data } = await supabaseAdmin.storage.from(RESUME_BUCKET).createSignedUrl(candidate.resumePath, 300);
    resumeUrl = data?.signedUrl ?? null;
  }

  return (
    <>
      <Header
        title={candidate.name}
        backHref="/recrutamento/banco-de-talentos"
        breadcrumb={[
          { label: "Recrutamento" },
          { label: "Banco de Talentos", href: "/recrutamento/banco-de-talentos" },
          { label: candidate.name },
        ]}
      />
      <div className="fin-content">
        <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border)" }}>
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/recrutamento/banco-de-talentos/${candidateId}?tab=${t.key}`}
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
              {t.key === "candidaturas" ? ` (${candidate.applications.length})` : ""}
            </Link>
          ))}
        </div>

        {activeTab === "perfil" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <CandidateProfileForm
              candidateId={candidate.id}
              initial={{
                name: candidate.name,
                email: candidate.email,
                phone: candidate.phone ?? "",
                linkedinUrl: candidate.linkedinUrl ?? "",
              }}
            />

            {resumeUrl ? (
              <div className="fin-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <FileText size={18} style={{ color: "var(--text-muted)" }} />
                  <span style={{ fontSize: 14, fontWeight: 500 }}>Currículo anexado</span>
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
                title="Nenhum currículo anexado"
                description="Anexe o PDF do currículo desta pessoa."
                action={<CandidateResumeUpload candidateId={candidate.id} />}
              />
            )}

            {/* Reservado para o resumo por IA do currículo (fase futura) —
                sem placeholder visível de propósito. */}
          </div>
        )}

        {activeTab === "candidaturas" &&
          (candidate.applications.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Nenhuma candidatura ainda"
              description="Candidaturas desta pessoa a vagas da empresa aparecem aqui."
            />
          ) : (
            <div className="fin-card" style={{ padding: 0 }}>
              {candidate.applications.map((app, index) => (
                <Link
                  key={app.id}
                  href={`/recrutamento/vagas/${app.jobId}/candidaturas/${app.id}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "16px 24px",
                    borderTop: index === 0 ? "none" : "1px solid var(--border)",
                    color: "inherit",
                    textDecoration: "none",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{app.job.title}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                      {app.createdAt.toLocaleDateString("pt-BR")} · {STAGE_LABELS[app.stage as (typeof CANDIDATE_STAGES)[number]]}
                    </div>
                  </div>
                  <Badge tone={TERMINAL_STAGES.includes(app.stage as never) ? (app.stage === "HIRED" ? "success" : "danger") : "primary"}>
                    {resultLabel(app.stage)}
                  </Badge>
                </Link>
              ))}
            </div>
          ))}

        {activeTab === "documentos" && (
          // Em desenvolvimento de propósito — quando existir, só pedir
          // documento pra candidatura na etapa Contratado (admissão, não
          // seleção).
          <EmptyState
            icon={Folder}
            title="Em desenvolvimento"
            description="Em breve você poderá receber e organizar os documentos de admissão do candidato aqui."
          />
        )}
      </div>
    </>
  );
}

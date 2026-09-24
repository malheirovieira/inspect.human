import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CandidateProfileForm } from "@/components/recrutamento/CandidateProfileForm";
import { CandidateResumeUpload } from "@/components/recrutamento/CandidateResumeUpload";
import { CandidateOptionsMenu } from "@/components/recrutamento/CandidateOptionsMenu";
import { AiSummaryCard } from "@/components/recrutamento/AiSummaryCard";
import { getPerson } from "@/services/candidates";
import { getProfileAiState } from "@/services/resumeAnalyses";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { RESUME_BUCKET } from "@/lib/resumes/files";
import { requireSession } from "@/lib/session";
import { STAGE_LABELS, TERMINAL_STAGES, type CANDIDATE_STAGES } from "@/schemas/candidate";
import { FileText, Folder, Download } from "lucide-react";

const RESUME_SOURCE_LABELS: Record<string, string> = {
  PUBLIC_FORM: "enviado pelo candidato",
  RECRUITER: "enviado pelo recrutador",
  LEGACY: "anterior ao histórico de versões",
};

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

  const [candidate, session] = await Promise.all([getPerson(candidateId), requireSession()]);
  if (!candidate) notFound();
  const aiState = activeTab === "perfil" ? await getProfileAiState(candidate.id) : null;

  // Versão atual + anteriores. Sem versão ainda (pessoa anterior ao
  // versionamento e backfill não rodado), cai no arquivo legado resumePath.
  const currentResume = candidate.resumes.find((r) => r.id === candidate.currentResumeId) ?? null;
  const previousResumes = candidate.resumes.filter((r) => r.id !== candidate.currentResumeId);
  const legacyPath = !currentResume && candidate.resumes.length === 0 ? candidate.resumePath : null;

  // URLs assinadas e de curta duração — o bucket é privado, então o link de
  // download só funciona por um tempo curto em vez de ficar público pra
  // sempre. Só gera quando a aba Perfil está de fato aberta.
  const signedUrls = new Map<string, string>();
  const pathsToSign = [
    ...(currentResume ? [currentResume.storagePath] : []),
    ...previousResumes.map((r) => r.storagePath),
    ...(legacyPath ? [legacyPath] : []),
  ];
  if (activeTab === "perfil" && pathsToSign.length > 0) {
    const { data } = await createSupabaseAdminClient().storage.from(RESUME_BUCKET).createSignedUrls(pathsToSign, 300);
    for (const item of data ?? []) {
      if (item.path && item.signedUrl) signedUrls.set(item.path, item.signedUrl);
    }
  }
  const resumeUrl = currentResume
    ? signedUrls.get(currentResume.storagePath) ?? null
    : legacyPath
      ? signedUrls.get(legacyPath) ?? null
      : null;

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
        <div style={{ display: "flex", alignItems: "center", gap: 4, borderBottom: "1px solid var(--border)" }}>
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
          {/* Selo "Teste" sempre visível quando marcado; o menu ⋮ (onde se
              marca/desmarca) só pra ADMIN. */}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, paddingBottom: 4 }}>
            {candidate.isTest && <Badge tone="primary">Teste</Badge>}
            {session.role === "ADMIN" && <CandidateOptionsMenu candidateId={candidate.id} isTest={candidate.isTest} />}
          </div>
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

            {/* Resumo por IA — ACIMA do currículo. Some quando não há currículo. */}
            {aiState && <AiSummaryCard candidateId={candidate.id} state={aiState} />}

            {resumeUrl ? (
              <div className="fin-card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <FileText size={18} style={{ color: "var(--text-muted)" }} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>Currículo atual</div>
                      {currentResume && (
                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                          {currentResume.createdAt.toLocaleDateString("pt-BR")} ·{" "}
                          {RESUME_SOURCE_LABELS[currentResume.source] ?? currentResume.source}
                        </div>
                      )}
                    </div>
                  </div>
                  <a href={resumeUrl} target="_blank" rel="noreferrer">
                    <Button variant="secondary">
                      <Download size={14} /> Baixar PDF
                    </Button>
                  </a>
                </div>

                {previousResumes.length > 0 && (
                  <details>
                    <summary style={{ fontSize: 13, color: "var(--text-secondary)", cursor: "pointer" }}>
                      Versões anteriores ({previousResumes.length})
                    </summary>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                      {previousResumes.map((r) => {
                        const url = signedUrls.get(r.storagePath);
                        return (
                          <div key={r.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13 }}>
                            <span style={{ color: "var(--text-muted)" }}>
                              {r.createdAt.toLocaleDateString("pt-BR")} · {RESUME_SOURCE_LABELS[r.source] ?? r.source}
                            </span>
                            {url && (
                              <a href={url} target="_blank" rel="noreferrer" style={{ color: "var(--action-primary-text)" }}>
                                Baixar
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </details>
                )}

                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
                  <CandidateResumeUpload candidateId={candidate.id} submitLabel="Enviar nova versão" />
                </div>
              </div>
            ) : (
              <EmptyState
                icon={FileText}
                title="Nenhum currículo anexado"
                description="Anexe o PDF do currículo desta pessoa."
                action={<CandidateResumeUpload candidateId={candidate.id} />}
              />
            )}
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

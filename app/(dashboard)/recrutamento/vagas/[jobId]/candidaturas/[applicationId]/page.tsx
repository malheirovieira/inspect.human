import { notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { ApplicationHeader } from "@/components/recrutamento/ApplicationHeader";
import { CandidateProcessChecklist } from "@/components/recrutamento/CandidateProcessChecklist";
import { CandidateTimeline } from "@/components/recrutamento/CandidateTimeline";
import { InterviewSection } from "@/components/recrutamento/InterviewSection";
import { getApplication } from "@/services/applications";
import { listApplicationEvents } from "@/services/applicationEvents";
import { getKanbanStageLabels } from "@/services/kanbanLabels";
import { CANDIDATE_STAGES, type CANDIDATE_TAGS } from "@/schemas/candidate";

type Stage = (typeof CANDIDATE_STAGES)[number];
type Tag = (typeof CANDIDATE_TAGS)[number];

export default async function CandidaturaDetalhePage({
  params,
}: {
  params: Promise<{ jobId: string; applicationId: string }>;
}) {
  const { jobId, applicationId } = await params;

  const application = await getApplication(applicationId);
  if (!application || application.jobId !== jobId) notFound();

  const [events, stageLabels] = await Promise.all([listApplicationEvents(applicationId), getKanbanStageLabels()]);

  // Etapa em que a candidatura estava antes de ser reprovada — pega do
  // último evento STAGE_CHANGED com destino REJECTED (events já vem em
  // ordem decrescente, então o primeiro achado é o mais recente).
  const rejectionEvent = events.find(
    (e) => e.type === "STAGE_CHANGED" && (e.payload as { to?: string } | null)?.to === "REJECTED"
  );
  const rejectedFromStage = (rejectionEvent?.payload as { from?: string } | null)?.from as Stage | undefined;

  return (
    <>
      <Header
        title={application.candidate.name}
        backHref={`/recrutamento/vagas/${jobId}?tab=candidatos`}
        breadcrumb={[
          { label: "Recrutamento" },
          { label: "Vagas", href: "/recrutamento/vagas" },
          { label: application.job.title, href: `/recrutamento/vagas/${jobId}` },
          { label: application.candidate.name },
        ]}
      />
      <div className="fin-content">
        <ApplicationHeader
          applicationId={application.id}
          candidateId={application.candidateId}
          candidateName={application.candidate.name}
          jobTitle={application.job.title}
          jobId={jobId}
          stage={application.stage as Stage}
          tag={application.qualificationTag as Tag | null}
          stageLabels={stageLabels}
        />

        <InterviewSection
          applicationId={application.id}
          interviews={application.interviews ?? []}
          highlightScheduling={application.qualificationTag === "GREEN"}
        />

        <CandidateProcessChecklist
          applicationId={application.id}
          stage={application.stage as Stage}
          stageLabels={stageLabels}
          rejectedFromStage={rejectedFromStage ?? null}
        />

        <CandidateTimeline applicationId={application.id} events={events} />
      </div>
    </>
  );
}

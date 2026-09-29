"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { moveCandidateStage } from "@/app/(dashboard)/recrutamento/banco-de-talentos/actions";
import { PIPELINE_STAGES, STAGE_LABELS, type CANDIDATE_STAGES } from "@/schemas/candidate";

type Stage = (typeof CANDIDATE_STAGES)[number];

// Checklist = as MESMAS etapas do Kanban da vaga, na mesma ordem — sem
// armazenamento próprio. "Concluído"/"atual"/"pendente" é só a posição de
// `stage` dentro de PIPELINE_STAGES; clicar numa etapa chama a mesma action
// que o drag do Kanban usa (moveCandidateStage), então os dois ficam
// sincronizados automaticamente, sem código extra.
export function CandidateProcessChecklist({
  applicationId,
  stage,
  stageLabels,
  rejectedFromStage,
}: {
  applicationId: string;
  stage: Stage;
  stageLabels: Record<Stage, string>;
  // Etapa em que a candidatura estava antes de ser reprovada (derivado do
  // último evento STAGE_CHANGED com to=REJECTED) — null se nunca chegou a
  // ter uma etapa anterior registrada.
  rejectedFromStage: Stage | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<Stage | null>(null);

  const isRejected = stage === "REJECTED";
  const effectiveStage = isRejected ? rejectedFromStage : stage;
  // indexOf devolve -1 pra qualquer valor fora de PIPELINE_STAGES (ex.: se
  // effectiveStage nunca foi determinado) — nada aparece como concluído,
  // fallback seguro.
  const currentIndex = effectiveStage ? PIPELINE_STAGES.indexOf(effectiveStage as (typeof PIPELINE_STAGES)[number]) : -1;

  // Clicar numa etapa futura ou passada pula direto pra ela. Clicar de novo
  // na etapa ATUAL "desmarca" — recua pra etapa anterior do pipeline, em vez
  // de ficar parado na mesma (sem esse caso, reclicar em "Entrevista" não
  // fazia nada).
  async function handleClick(step: Stage, isCurrentStep: boolean) {
    let target: Stage = step;
    if (isCurrentStep) {
      const idx = PIPELINE_STAGES.indexOf(step as (typeof PIPELINE_STAGES)[number]);
      target = PIPELINE_STAGES[Math.max(0, idx - 1)];
    }

    setPending(step);
    await moveCandidateStage(applicationId, target);
    setPending(null);
    router.refresh();
  }

  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span className="fin-eyebrow">CHECKLIST DO PROCESSO</span>
      <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 16px" }}>
        Mesma etapa do Kanban da vaga — clicar aqui move o card lá também.
      </p>

      {isRejected && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: "var(--radius-md)",
            background: "var(--danger-surface)",
            color: "var(--danger)",
            fontSize: 13,
            fontWeight: 500,
            marginBottom: 12,
          }}
        >
          Reprovado {effectiveStage ? `em "${stageLabels[effectiveStage]}"` : ""}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column" }}>
        {PIPELINE_STAGES.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = !isRejected && index === currentIndex;
          const isLast = index === PIPELINE_STAGES.length - 1;
          const isPending = pending === step;

          return (
            <button
              key={step}
              type="button"
              onClick={() => handleClick(step, isCurrent)}
              disabled={isPending}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 14,
                background: "none",
                border: "none",
                padding: 0,
                textAlign: "left",
                cursor: isPending ? "wait" : "pointer",
                width: "100%",
                font: "inherit",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "var(--radius-full)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    background: isCompleted || isCurrent ? "var(--action-primary)" : "var(--surface)",
                    border: isCompleted || isCurrent ? "none" : "2px solid var(--border)",
                    transition: "background 0.2s ease, border-color 0.2s ease",
                  }}
                >
                  {isCompleted && <Check size={13} color="var(--on-action-primary)" strokeWidth={3} />}
                </div>
                {!isLast && (
                  <div
                    style={{
                      width: 2,
                      flex: 1,
                      minHeight: 28,
                      background: isCompleted ? "var(--action-primary)" : "var(--border)",
                      transition: "background 0.2s ease",
                    }}
                  />
                )}
              </div>
              <div style={{ paddingBottom: 22 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: isCompleted || isCurrent ? "var(--text-primary)" : "var(--text-muted)",
                  }}
                >
                  {stageLabels[step] ?? STAGE_LABELS[step]}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  {isCurrent ? "Etapa atual" : isCompleted ? "Concluída" : "Pendente"}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

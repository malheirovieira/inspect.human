"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { toggleProcessStep } from "@/app/(dashboard)/recrutamento/candidatos/actions";
import { PROCESS_STEPS, PROCESS_STEP_LABELS, type ProcessTimeline } from "@/schemas/candidate";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function CandidateTimeline({ candidateId, timeline }: { candidateId: string; timeline: ProcessTimeline }) {
  const router = useRouter();
  const [steps, setSteps] = useState<ProcessTimeline>(timeline);
  const [pendingStep, setPendingStep] = useState<string | null>(null);

  async function handleToggle(step: (typeof PROCESS_STEPS)[number]) {
    const isCompleted = Boolean(steps[step]);
    const stepIndex = PROCESS_STEPS.indexOf(step);
    setPendingStep(step);

    // Espelha a cascata do servidor: marcar preenche as anteriores,
    // desmarcar limpa as posteriores.
    setSteps((prev) => {
      const next = { ...prev };
      if (isCompleted) {
        for (let i = stepIndex; i < PROCESS_STEPS.length; i++) next[PROCESS_STEPS[i]] = null;
      } else {
        const now = new Date().toISOString();
        for (let i = 0; i <= stepIndex; i++) {
          if (!next[PROCESS_STEPS[i]]) next[PROCESS_STEPS[i]] = now;
        }
      }
      return next;
    });

    await toggleProcessStep(candidateId, step);

    setPendingStep(null);
    router.refresh();
  }

  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span className="fin-eyebrow">LINHA DO TEMPO DO PROCESSO</span>
      <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 16px" }}>
        Marcar uma etapa completa também marca as anteriores; desmarcar uma etapa desmarca as posteriores.
      </p>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {PROCESS_STEPS.map((step, index) => {
          const completedAt = steps[step];
          const isCompleted = Boolean(completedAt);
          const isLast = index === PROCESS_STEPS.length - 1;
          const isPending = pendingStep === step;

          return (
            <button
              key={step}
              type="button"
              onClick={() => handleToggle(step)}
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
                    background: isCompleted ? "var(--action-primary)" : "var(--surface)",
                    border: isCompleted ? "none" : "2px solid var(--border)",
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
                    color: isCompleted ? "var(--text-primary)" : "var(--text-muted)",
                  }}
                >
                  {PROCESS_STEP_LABELS[step]}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  {completedAt ? formatDateTime(completedAt) : "Pendente"}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

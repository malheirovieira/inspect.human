"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, ArrowRightLeft, Tag, MessageSquare, Mail, Pencil, Sparkles, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { addApplicationNote } from "@/app/(dashboard)/recrutamento/banco-de-talentos/actions";
import { STAGE_LABELS, TAG_LABELS, type CANDIDATE_STAGES, type CANDIDATE_TAGS } from "@/schemas/candidate";

type EventRow = {
  id: string;
  type: string;
  payload: unknown;
  createdAt: Date;
  actor: { name: string } | null;
};

function formatDateTime(date: Date): string {
  return date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function stageLabel(stage: string | null): string {
  if (!stage) return "—";
  return STAGE_LABELS[stage as (typeof CANDIDATE_STAGES)[number]] ?? stage;
}

function tagLabel(tag: string | null): string {
  if (!tag) return "Aguardando Tag Triagem";
  return TAG_LABELS[tag as (typeof CANDIDATE_TAGS)[number]] ?? tag;
}

const PROFILE_FIELD_LABELS: Record<string, string> = {
  name: "Nome",
  email: "E-mail",
  phone: "Telefone",
  linkedinUrl: "LinkedIn",
};

const SOURCE_LABELS: Record<string, string> = {
  PUBLIC_FORM: "formulário público da vaga",
  MANUAL: "cadastro manual",
};

// type + payload -> (ícone, descrição). Eventos com type desconhecido (ex.:
// de uma versão futura) caem no fallback genérico em vez de sumir da lista.
function describeEvent(event: EventRow): { icon: LucideIcon; text: string } {
  const payload = (event.payload ?? {}) as Record<string, unknown>;

  switch (event.type) {
    case "APPLICATION_CREATED":
      return { icon: UserPlus, text: `Candidatura criada via ${SOURCE_LABELS[payload.source as string] ?? "sistema"}` };
    case "STAGE_CHANGED":
      return {
        icon: ArrowRightLeft,
        text: `Etapa alterada de "${stageLabel(payload.from as string | null)}" para "${stageLabel(payload.to as string | null)}"`,
      };
    case "TAG_CHANGED":
      return {
        icon: Tag,
        text: `Tag alterada de "${tagLabel(payload.from as string | null)}" para "${tagLabel(payload.to as string | null)}"`,
      };
    case "NOTE_ADDED":
      return { icon: MessageSquare, text: payload.note as string };
    case "PROFILE_UPDATED": {
      // Só os nomes dos campos (valores não ficam no histórico).
      const fields = Array.isArray(payload.fields) ? (payload.fields as string[]) : [];
      const names = fields.map((f) => PROFILE_FIELD_LABELS[f] ?? f).join(", ");
      return { icon: Pencil, text: names ? `Dados do candidato atualizados: ${names}` : "Dados do candidato atualizados" };
    }
    // Triagem com IA (lib/screening/analyzeResume.ts) — texto neutro, sobre o
    // resumo, nunca sobre o candidato.
    case "AI_SUMMARY_GENERATED":
      return {
        icon: Sparkles,
        text: payload.isMock ? "Resumo do currículo gerado (exemplo simulado · sem IA)" : "Resumo do currículo gerado por IA",
      };
    case "AI_SUMMARY_NO_TEXT":
      return { icon: Sparkles, text: "Resumo por IA não gerado: currículo sem texto legível" };
    case "AI_SUMMARY_FAILED":
      return { icon: Sparkles, text: "Falha ao gerar o resumo do currículo por IA" };
    case "EMAIL_QUEUED":
    case "EMAIL_SENT":
    case "EMAIL_FAILED":
      return { icon: Mail, text: (payload.summary as string) ?? "Evento de e-mail" };
    default:
      return { icon: MessageSquare, text: event.type };
  }
}

// Linha do tempo única da candidatura: campo de anotação no topo (anotação
// é só mais um tipo de evento, ApplicationEvent) e, abaixo, todo o
// histórico em ordem cronológica decrescente — substitui os antigos
// "Histórico do processo" + "Adicionar anotação" + "Histórico de atividade".
export function CandidateTimeline({ applicationId, events }: { applicationId: string; events: EventRow[] }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await addApplicationNote(applicationId, note);

    setSubmitting(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setNote("");
    router.refresh();
  }

  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <span className="fin-eyebrow">LINHA DO TEMPO</span>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Textarea
          required
          placeholder="Ex.: Entrevista técnica marcada para sexta-feira às 14h."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        {error && <div style={{ fontSize: 12, color: "var(--danger)" }}>{error}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button type="submit" variant={submitting ? "disabled" : "confirm"}>
            {submitting ? "Salvando..." : "Adicionar anotação"}
          </Button>
        </div>
      </form>

      {events.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Nenhuma atividade registrada ainda.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {events.map((event, index) => {
            const { icon: Icon, text } = describeEvent(event);
            const isLast = index === events.length - 1;
            return (
              <div key={event.id} style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
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
                      background: "var(--surface-muted)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <Icon size={12} />
                  </div>
                  {!isLast && <div style={{ width: 2, flex: 1, minHeight: 20, background: "var(--border)" }} />}
                </div>
                <div style={{ paddingBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{text}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                    {formatDateTime(event.createdAt)} · {event.actor?.name ?? "Sistema"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

import Link from "next/link";
import { CalendarDays } from "lucide-react";
import type { AttentionItem, AttentionType } from "@/services/attention";

// Card de pendência ("Precisa da sua atenção", tela Início).
// Referência visual: Uiverse.io (licença MIT) — adaptado ao design system:
// sem cursor de arrastar (é um link), sem visualizadores e sem menu de
// opções; etiqueta com uma cor por tipo (tokens --attention-* em
// globals.css, .fin-attention-card).

const TAG_LABEL: Record<AttentionType, string> = {
  NEW_APPLICATIONS: "Candidaturas novas",
  STALLED: "Candidatos parados",
  NO_APPLICATIONS: "Vaga sem candidaturas",
};

const dateFormat = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" });

function title(item: AttentionItem): string {
  const n = item.count;
  switch (item.type) {
    case "NEW_APPLICATIONS":
      return `${n} ${n === 1 ? "candidatura nova" : "candidaturas novas"} em ${item.jobTitle}`;
    case "STALLED":
      return `${n} ${n === 1 ? "candidato parado" : "candidatos parados"} na mesma etapa em ${item.jobTitle}`;
    case "NO_APPLICATIONS":
      return `${n} dias sem candidaturas em ${item.jobTitle}`;
  }
}

function footer(item: AttentionItem): string {
  const date = dateFormat.format(new Date(item.since));
  switch (item.type) {
    case "NEW_APPLICATIONS":
      return `Mais antiga em ${date}`;
    case "STALLED":
      return `Parado desde ${date}`;
    case "NO_APPLICATIONS":
      return item.hadApplications ? `Última candidatura em ${date}` : `Aberta em ${date}`;
  }
}

export function AttentionCard({ item }: { item: AttentionItem }) {
  // Pendência de candidatos leva direto pro pipeline da vaga.
  const href =
    item.type === "NO_APPLICATIONS" ? `/recrutamento/vagas/${item.jobId}` : `/recrutamento/vagas/${item.jobId}?tab=candidatos`;

  return (
    <Link href={href} className="fin-attention-card">
      <span className={`fin-attention-card__tag fin-attention-card__tag--${item.type.toLowerCase().replace("_", "-")}`}>
        {TAG_LABEL[item.type]}
      </span>
      <p className="fin-attention-card__title">{title(item)}</p>
      <div className="fin-attention-card__stats">
        <CalendarDays size={14} aria-hidden="true" />
        {footer(item)}
      </div>
    </Link>
  );
}

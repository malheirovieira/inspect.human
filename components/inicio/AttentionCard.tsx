import Link from "next/link";
import { CalendarDays } from "lucide-react";
import type { AttentionItem, AttentionType } from "@/services/attention";

// Card de pendência ("Precisa da sua atenção", tela Início).
// From Uiverse.io by Yaya12085 (licença MIT) — IDÊNTICO à referência (mesmas
// cores, tamanhos, sombras, bordas e espaçamentos; CSS em globals.css,
// .fin-attention-card). Únicas diferenças: cursor de link (não de arrastar)
// e sem botão de opções e visualizadores, que não teriam função aqui.

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
      <div className="fin-attention-card__tags">
        <span className="fin-attention-card__tag">{TAG_LABEL[item.type]}</span>
      </div>
      <p className="fin-attention-card__title">{title(item)}</p>
      <div className="fin-attention-card__stats">
        <div>
          <CalendarDays aria-hidden="true" />
          {footer(item)}
        </div>
      </div>
    </Link>
  );
}

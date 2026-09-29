import Link from "next/link";

export type CandidaturaTab = "entrevista" | "processo" | "disc" | "historico";

export const CANDIDATURA_TABS: { key: CandidaturaTab; label: string }[] = [
  { key: "entrevista", label: "Entrevista" },
  { key: "processo", label: "Processo" },
  { key: "disc", label: "DISC" },
  { key: "historico", label: "Histórico" },
];

// Barra de navegação por abas — mesmo padrão de PessoaPerfilPage (Links com
// ?tab=, decidido no servidor), não useState client-side: evita montar os
// quatro componentes de conteúdo de uma vez e permite linkar direto pra uma
// aba específica (ex.: mandar o recrutador direto pra "?tab=disc").
export function CandidaturaTabs({ basePath, activeTab }: { basePath: string; activeTab: CandidaturaTab }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, borderBottom: "1px solid var(--border)" }}>
      {CANDIDATURA_TABS.map((t) => (
        <Link
          key={t.key}
          href={`${basePath}?tab=${t.key}`}
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
  );
}

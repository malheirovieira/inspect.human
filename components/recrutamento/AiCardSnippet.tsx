// Trecho do resumo por IA nos cards (kanban e lista): até 3 tags de
// competência e o tempo de experiência — SEM o resumo. Só aparece com
// análise concluída. Sem hooks: serve em Server e Client Component.
export function AiCardSnippet({ skills, experienceYears }: { skills?: string[]; experienceYears?: number | null }) {
  const top = (skills ?? []).slice(0, 3);
  const hasYears = typeof experienceYears === "number";
  if (top.length === 0 && !hasYears) return null;

  const years = hasYears
    ? experienceYears! < 1
      ? "< 1 ano"
      : `${Number.isInteger(experienceYears) ? experienceYears : experienceYears!.toFixed(1).replace(".", ",")} ${experienceYears === 1 ? "ano" : "anos"}`
    : null;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4, marginTop: 6 }}>
      {years && (
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginRight: 2 }} title="Experiência (resumo por IA)">
          {years}
        </span>
      )}
      {top.map((skill) => (
        <span
          key={skill}
          style={{
            fontSize: 11,
            padding: "1px 8px",
            borderRadius: "var(--radius-full)",
            background: "var(--surface-muted)",
            color: "var(--text-secondary)",
            whiteSpace: "nowrap",
          }}
        >
          {skill}
        </span>
      ))}
    </div>
  );
}

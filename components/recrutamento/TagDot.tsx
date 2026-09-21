import { TAG_LABELS, TAG_COLORS, type CANDIDATE_TAGS } from "@/schemas/candidate";

// Bolinha da tag de qualificação. Por padrão (interactive=true), ao passar
// o mouse ela cresce pra esquerda e revela a descrição por dentro, tipo um
// chip que se expande. No Kanban isso ficava bugado (coluna estreita), então
// lá é usada a versão simples (interactive=false): só a bolinha, sem hover.
export function TagDot({
  tag,
  interactive = true,
}: {
  tag: (typeof CANDIDATE_TAGS)[number];
  interactive?: boolean;
}) {
  if (!interactive) {
    return (
      <span
        title={TAG_LABELS[tag]}
        style={{
          width: 10,
          height: 10,
          borderRadius: "var(--radius-full)",
          background: TAG_COLORS[tag],
          flexShrink: 0,
          display: "inline-block",
        }}
      />
    );
  }

  return (
    <span className="group relative inline-flex shrink-0 items-center justify-end" style={{ width: 14, height: 14 }}>
      <span
        className="absolute right-0 top-1/2 flex h-[14px] w-[14px] -translate-y-1/2 items-center justify-center overflow-hidden whitespace-nowrap rounded-full shadow-sm transition-all duration-300 ease-out group-hover:h-[24px] group-hover:w-[190px] group-hover:rounded-lg group-hover:px-3"
        style={{ background: TAG_COLORS[tag], zIndex: 20 }}
      >
        <span className="text-[11px] font-semibold text-white opacity-0 transition-opacity delay-100 duration-150 group-hover:opacity-100">
          {TAG_LABELS[tag]}
        </span>
      </span>
    </span>
  );
}

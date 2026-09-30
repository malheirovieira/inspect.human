"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DndContext,
  pointerWithin,
  rectIntersection,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Select } from "@/components/ui/Field";
import { TagDot } from "@/components/recrutamento/TagDot";
import { AiCardSnippet } from "@/components/recrutamento/AiCardSnippet";
import { Badge } from "@/components/ui/Badge";
import { Pencil } from "lucide-react";
import {
  moveCandidateInKanban,
  setKanbanStageLabel,
} from "@/app/(dashboard)/recrutamento/banco-de-talentos/actions";
import { CANDIDATE_STAGES, type CANDIDATE_TAGS } from "@/schemas/candidate";

type Stage = (typeof CANDIDATE_STAGES)[number];
type SortMode = "manual" | "name" | "tag";

export type KanbanCandidate = {
  id: string;
  name: string;
  email: string;
  stage: string;
  qualificationTag: string | null;
  position: number;
  job: { title: string };
  isTest?: boolean;
  // Resumo por IA (análise concluída): até 3 tags + experiência no card.
  aiSkills?: string[];
  aiExperienceYears?: number | null;
  // DISC: perfil+score só quando respondido; discPending = link gerado mas
  // ainda sem resposta. Nenhum dos dois = avaliação não enviada.
  discPerfil?: string | null;
  discScoreGeral?: number | null;
  discPending?: boolean;
};

const TAG_ORDER: Record<string, number> = { GREEN: 0, BLUE: 1, RED: 2 };

function groupAndSort(candidates: KanbanCandidate[], mode: SortMode): Record<Stage, KanbanCandidate[]> {
  const columns = {} as Record<Stage, KanbanCandidate[]>;
  for (const stage of CANDIDATE_STAGES) columns[stage] = [];
  for (const candidate of candidates) {
    if (columns[candidate.stage as Stage]) columns[candidate.stage as Stage].push(candidate);
  }
  for (const stage of CANDIDATE_STAGES) {
    if (mode === "name") {
      columns[stage].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    } else if (mode === "tag") {
      columns[stage].sort(
        (a, b) => (TAG_ORDER[a.qualificationTag ?? ""] ?? 99) - (TAG_ORDER[b.qualificationTag ?? ""] ?? 99)
      );
    } else {
      columns[stage].sort((a, b) => a.position - b.position);
    }
  }
  return columns;
}

// Estilo Trello: o card inteiro é a área de arrastar (sem alça separada) —
// o activationConstraint de 5px no sensor (ver useSensors abaixo) garante
// que um clique simples (sem arrastar) ainda funcione como navegação normal
// pro Link interno, em vez de ser sequestrado pelo drag.
function CandidateCard({ candidate, jobId, showJob }: { candidate: KanbanCandidate; jobId: string; showJob: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: candidate.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="fin-kanban-card">
      {candidate.qualificationTag && candidate.stage === "TRIAGE" && (
        <TagDot tag={candidate.qualificationTag as (typeof CANDIDATE_TAGS)[number]} interactive={false} />
      )}
      <Link href={`/recrutamento/vagas/${jobId}/candidaturas/${candidate.id}`} style={{ textDecoration: "none", color: "inherit" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600, lineHeight: 1.4, color: "var(--ink)" }}>
          {candidate.name}
          {candidate.isTest && (
            <Badge tone="primary" style={{ fontSize: 11, padding: "0 6px" }}>
              Teste
            </Badge>
          )}
        </div>
        {showJob && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{candidate.job.title}</div>}
        <AiCardSnippet skills={candidate.aiSkills} experienceYears={candidate.aiExperienceYears} />
        {candidate.discPerfil && (
          <Badge tone="success" style={{ fontSize: 11, padding: "0 6px", marginTop: 6 }}>
            {candidate.discPerfil} | {Math.round(candidate.discScoreGeral ?? 0)}
          </Badge>
        )}
        {!candidate.discPerfil && candidate.discPending && (
          <Badge tone="primary" style={{ fontSize: 11, padding: "0 6px", marginTop: 6 }}>
            DISC pendente
          </Badge>
        )}
      </Link>
    </div>
  );
}

function StageColumn({
  stage,
  label,
  candidates,
  jobId,
  showJob,
  editing,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
}: {
  stage: Stage;
  label: string;
  candidates: KanbanCandidate[];
  jobId: string;
  showJob: boolean;
  editing: boolean;
  onStartEdit: () => void;
  onSaveEdit: (value: string) => void;
  onCancelEdit: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const [value, setValue] = useState(label);

  return (
    <div
      ref={setNodeRef}
      style={{
        width: 304,
        flexShrink: 0,
        background: isOver ? "var(--surface-selected)" : "var(--surface-muted)",
        borderRadius: "var(--radius-lg)",
        padding: 10,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        transition: "background 0.15s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 6px 2px", gap: 6 }}>
        {editing ? (
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={() => onSaveEdit(value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSaveEdit(value);
              if (e.key === "Escape") onCancelEdit();
            }}
            className="fin-input"
            style={{ height: 28, fontSize: 13, padding: "0 8px" }}
          />
        ) : (
          <span
            style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          >
            {label}
          </span>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-secondary)",
              background: "var(--surface)",
              borderRadius: "var(--radius-full)",
              padding: "1px 9px",
            }}
          >
            {candidates.length}
          </span>
          {!editing && (
            <button
              type="button"
              onClick={() => {
                setValue(label);
                onStartEdit();
              }}
              aria-label="Renomear etapa"
              style={{ background: "none", border: "none", padding: 2, cursor: "pointer", color: "var(--text-muted)", display: "flex" }}
            >
              <Pencil size={12} />
            </button>
          )}
        </div>
      </div>

      <SortableContext items={candidates.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 40 }}>
          {candidates.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--text-muted)", padding: "4px 6px", margin: 0 }}>Nenhum candidato</p>
          ) : (
            candidates.map((candidate) => (
              <CandidateCard key={candidate.id} candidate={candidate} jobId={jobId} showJob={showJob} />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export function KanbanBoard({
  candidates,
  stageLabels,
  jobId,
  showJob = true,
  visibleStages = CANDIDATE_STAGES,
}: {
  candidates: KanbanCandidate[];
  stageLabels: Record<Stage, string>;
  jobId: string;
  showJob?: boolean;
  // Quais colunas renderizar — default é todas. Usado pra esconder
  // "Reprovado" quando o filtro "Mostrar reprovados" está desligado (os
  // candidatos continuam existindo, só não aparecem como coluna vazia/cheia).
  visibleStages?: readonly Stage[];
}) {
  const router = useRouter();
  const [sortMode, setSortMode] = useState<SortMode>("manual");
  const [columns, setColumns] = useState(() => groupAndSort(candidates, "manual"));
  const [labels, setLabels] = useState(stageLabels);
  const [editingStage, setEditingStage] = useState<Stage | null>(null);

  useEffect(() => {
    setColumns(groupAndSort(candidates, sortMode));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidates, sortMode]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // closestCorners falha em boards com colunas de tamanhos desiguais
  // (coluna grande contendo cards pequenos) — o card acaba "vencendo" a
  // coluna vizinha mesmo quando o ponteiro já está sobre ela, e o drag
  // parece só funcionar dentro do mesmo container. pointerWithin (o
  // ponteiro está literalmente dentro da área) resolve isso; caímos pra
  // rectIntersection só quando o ponteiro sai de toda área arrastável
  // (ex.: soltando bem na borda).
  const collisionDetection: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) return pointerCollisions;
    return rectIntersection(args);
  };

  function findContainer(id: string): Stage | undefined {
    if (CANDIDATE_STAGES.includes(id as Stage)) return id as Stage;
    return CANDIDATE_STAGES.find((stage) => columns[stage].some((c) => c.id === id));
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeContainer = findContainer(active.id as string);
    const overContainer = findContainer(over.id as string);
    if (!activeContainer || !overContainer || activeContainer === overContainer) return;

    setColumns((prev) => {
      const activeItems = prev[activeContainer];
      const overItems = prev[overContainer];
      const activeIndex = activeItems.findIndex((c) => c.id === active.id);
      if (activeIndex === -1) return prev;
      const movingItem = activeItems[activeIndex];
      const overIndex = overItems.findIndex((c) => c.id === over.id);
      const insertIndex = overIndex >= 0 ? overIndex : overItems.length;

      return {
        ...prev,
        [activeContainer]: activeItems.filter((c) => c.id !== active.id),
        [overContainer]: [...overItems.slice(0, insertIndex), movingItem, ...overItems.slice(insertIndex)],
      };
    });
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeContainer = findContainer(active.id as string);
    const overContainer = findContainer(over.id as string);
    if (!activeContainer || !overContainer) return;

    // Use overContainer (destino) em vez de activeContainer se arrastou entre stages
    const finalStage = overContainer;

    let finalItems = columns[finalStage];
    const oldIndex = finalItems.findIndex((c) => c.id === active.id);

    if (activeContainer === finalStage && active.id !== over.id) {
      const newIndex = finalItems.findIndex((c) => c.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        finalItems = arrayMove(finalItems, oldIndex, newIndex);
        setColumns((prev) => ({ ...prev, [finalStage]: finalItems }));
      }
    }

    const orderedIds = finalItems.map((c) => c.id);
    await moveCandidateInKanban(active.id as string, finalStage, orderedIds);
    router.refresh();
  }

  async function handleSaveLabel(stage: Stage, value: string) {
    setEditingStage(null);
    const trimmed = value.trim();
    if (!trimmed || trimmed === labels[stage]) return;
    setLabels((prev) => ({ ...prev, [stage]: trimmed }));
    await setKanbanStageLabel(stage, trimmed);
    router.refresh();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Ordenar por</span>
        <Select value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)} style={{ maxWidth: 200 }}>
          <option value="manual">Manual (arrastar)</option>
          <option value="name">Nome (A-Z)</option>
          <option value="tag">Cor da tag</option>
        </Select>
      </div>

      <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start", overflowX: "auto", paddingBottom: 8 }}>
          {visibleStages.map((stage) => (
            <StageColumn
              key={stage}
              stage={stage}
              label={labels[stage]}
              candidates={columns[stage]}
              jobId={jobId}
              showJob={showJob}
              editing={editingStage === stage}
              onStartEdit={() => setEditingStage(stage)}
              onSaveEdit={(value) => handleSaveLabel(stage, value)}
              onCancelEdit={() => setEditingStage(null)}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}

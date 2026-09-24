import type { TaskDefinition } from "../registry";
import { resumeAnalyzeTask } from "./resumeAnalyze";
import { resumePurgeVersionsTask } from "./resumePurgeVersions";

// Registro ÚNICO de tipos de tarefa. Cada fase cria o seu handler num
// arquivo próprio desta pasta (com defineTask) e só acrescenta aqui.
//
// Tipo de tarefa no formato "modulo.acao" (ex.: "email.send"). Handlers
// importam de "../registry" e "../errors" — nunca de "@/lib/tasks" (o index
// importa este arquivo; seria import circular).
export const TASK_DEFINITIONS: readonly TaskDefinition<any>[] = [
  resumeAnalyzeTask, // Fase 3 — triagem com IA
  resumePurgeVersionsTask, // Fase 3 — retenção de versões de currículo
];

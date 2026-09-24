// Retenção de versões SUBSTITUÍDAS do currículo (candidate_resumes com
// supersededAt preenchido): apagadas — arquivo, texto extraído e análises —
// depois deste prazo, contado de quando deixaram de ser a versão atual.
// Versões ainda ligadas a candidatura em andamento são mantidas.
//
// ⚠ VALOR PROVISÓRIO — PENDENTE DE VALIDAÇÃO JURÍDICA (LGPD). Registrado em
// CONTEXT.md, "Pendências conhecidas". A limpeza em si (tarefa
// resume.purge_versions na fila) entra na etapa 2 da Fase 3.
export const RESUME_VERSION_RETENTION_MONTHS = 12;

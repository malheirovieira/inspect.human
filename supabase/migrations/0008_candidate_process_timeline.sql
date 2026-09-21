-- ============================================================================
-- Linha do tempo granular do processo seletivo (aba Processo do candidato).
-- Mapa { chave_da_etapa: timestamp ISO | null }, independente do "stage"
-- grosso usado no Kanban (Triagem/Entrevista/Proposta/Contratado).
-- ============================================================================

alter table candidates add column if not exists process_steps jsonb;

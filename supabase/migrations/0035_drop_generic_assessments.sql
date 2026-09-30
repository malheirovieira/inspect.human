-- Remove por completo o sistema genérico de assessments (Fase 2 original) —
-- decisão de produto: DISC é o único tipo de avaliação do sistema daqui pra
-- frente. As tabelas nunca tiveram uso real em produção (confirmado: 0
-- respostas em ambos os bancos verificados nesta sessão).
--
-- Ordem importa: assessment_answers/assessment_choices referenciam
-- assessment_questions, que referencia assessments; jobs.assessment_id
-- referencia assessments também. Cascade nas FKs já cuidaria da ordem
-- automaticamente com um único DROP TABLE ... CASCADE, mas listar explícito
-- deixa claro o que está sendo removido.

alter table public.jobs drop column if exists assessment_id;

drop table if exists public.assessment_answers;
drop table if exists public.assessment_choices;
drop table if exists public.assessment_questions;
drop table if exists public.assessment_responses;
drop table if exists public.assessments;

-- Link da entrevista (Google Meet, Teams, Zoom, endereço presencial etc.),
-- adicionado separadamente do agendamento inicial pra permitir o fluxo:
-- 1) agenda data/hora → e-mail "Convite Entrevista"
-- 2) preenche o link depois → botão "Enviar Link" dispara e-mail à parte
ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS interview_link TEXT;

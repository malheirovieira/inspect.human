-- Add new fields to interviews table for detailed scheduling information
ALTER TABLE public.interviews
  ADD COLUMN modality TEXT DEFAULT 'PRESENCIAL' CHECK (modality IN ('PRESENCIAL', 'REMOTO')),
  ADD COLUMN interviewer_name TEXT,
  ADD COLUMN guests TEXT;

-- guests é JSON array serializado como string (ex: ["João Silva", "Maria Santos"])
-- isso permite flexibilidade sem precisar de tabela separada por enquanto

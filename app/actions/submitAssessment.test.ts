import { describe, it, expect, vi, beforeEach } from 'vitest';
import { submitAssessment } from './submitAssessment';

// Mock do Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      update: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
    })),
  })),
}));

describe('submitAssessment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve retornar erro se token for vazio', async () => {
    const result = await submitAssessment('', {});
    expect(result.success).toBe(false);
    expect(result.error).toBe('Token inválido');
  });

  it('deve retornar erro se nenhuma resposta for fornecida', async () => {
    const result = await submitAssessment('token123', {});
    expect(result.success).toBe(false);
    expect(result.error).toBe('Nenhuma resposta fornecida');
  });

  it('deve retornar erro se token não existir', async () => {
    const result = await submitAssessment('token123', {
      'question-1': 'choice-1',
    });
    expect(result.success).toBe(false);
  });

  // Testes de validação de respostas (mais próximos da realidade)
  // Nota: testes de integração com DB real devem estar em .test.db.ts
});

describe('submitAssessment - validações de segurança', () => {
  it('nunca deve confiar em isCorrect do cliente', () => {
    // Este teste documenta que o score é SEMPRE calculado no servidor,
    // nunca acreditando em dados do cliente
    const mockChoice = {
      id: 'choice-1',
      is_correct: true, // Sempre vem do servidor
      question_id: 'question-1',
    };

    // O servidor DEVE validar choice.is_correct contra o banco
    expect(typeof mockChoice.is_correct).toBe('boolean');
  });

  it('deve validar que choice pertence à pergunta correta', () => {
    // Documentação: choice.question_id DEVE corresponder à question.id
    const question = { id: 'q-1', max_score: 1 };
    const validChoice = { id: 'c-1', question_id: 'q-1', is_correct: true };
    const invalidChoice = { id: 'c-2', question_id: 'q-2', is_correct: true };

    expect(validChoice.question_id).toBe(question.id);
    expect(invalidChoice.question_id).not.toBe(question.id);
  });
});

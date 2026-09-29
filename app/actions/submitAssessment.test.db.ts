import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { submitAssessment } from './submitAssessment';

/**
 * Testes de integração com DB real
 * Rodar com: npm run test:db
 * Requer setup: npm run test:db:setup
 */

describe('submitAssessment - testes de integração', () => {
  let companyId: string;
  let jobId: string;
  let candidateId: string;
  let applicationId: string;
  let assessmentId: string;
  let questionId: string;
  let correctChoiceId: string;
  let incorrectChoiceId: string;
  let validToken: string;

  beforeAll(async () => {
    // Setup: criar dados de teste
    const company = await prisma.company.create({
      data: {
        name: 'Test Company',
        slug: `test-${Date.now()}`,
      },
    });
    companyId = company.id;

    const job = await prisma.job.create({
      data: {
        companyId,
        title: 'Test Job',
        description: 'Test Description',
        workMode: 'REMOTO',
        status: 'OPEN',
      },
    });
    jobId = job.id;

    const candidate = await prisma.candidate.create({
      data: {
        companyId,
        name: 'Test Candidate',
        email: `test-${Date.now()}@example.com`,
      },
    });
    candidateId = candidate.id;

    const application = await prisma.application.create({
      data: {
        companyId,
        candidateId,
        jobId,
        stage: 'TRIAGE',
      },
    });
    applicationId = application.id;

    // Criar teste + perguntas + opções
    const assessment = await prisma.assessment.create({
      data: {
        companyId,
        title: 'Test Assessment',
        totalScore: 2,
      },
    });
    assessmentId = assessment.id;

    const question = await prisma.assessmentQuestion.create({
      data: {
        companyId,
        assessmentId,
        text: 'What is 2+2?',
        type: 'MULTIPLE_CHOICE',
        maxScore: 1,
        position: 0,
      },
    });
    questionId = question.id;

    const correctChoice = await prisma.assessmentChoice.create({
      data: {
        companyId,
        questionId,
        text: '4',
        isCorrect: true,
        position: 0,
      },
    });
    correctChoiceId = correctChoice.id;

    const incorrectChoice = await prisma.assessmentChoice.create({
      data: {
        companyId,
        questionId,
        text: '5',
        isCorrect: false,
        position: 1,
      },
    });
    incorrectChoiceId = incorrectChoice.id;

    // Criar response com token
    const response = await prisma.assessmentResponse.create({
      data: {
        companyId,
        applicationId,
        assessmentId,
        token: `test-token-${Date.now()}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h no futuro
      },
    });
    validToken = response.token;
  });

  afterAll(async () => {
    // Cleanup: deletar dados de teste
    await prisma.assessmentAnswer.deleteMany({ where: { companyId } });
    await prisma.assessmentResponse.deleteMany({ where: { companyId } });
    await prisma.assessmentChoice.deleteMany({ where: { companyId } });
    await prisma.assessmentQuestion.deleteMany({ where: { companyId } });
    await prisma.assessment.deleteMany({ where: { companyId } });
    await prisma.application.deleteMany({ where: { companyId } });
    await prisma.candidate.deleteMany({ where: { companyId } });
    await prisma.job.deleteMany({ where: { companyId } });
    await prisma.company.deleteMany({ where: { id: companyId } });
  });

  it('deve calcular score correto quando todas as respostas estão certas', async () => {
    const result = await submitAssessment(validToken, {
      [questionId]: correctChoiceId,
    });

    expect(result.success).toBe(true);
    expect(result.score).toBe(1); // Resposta correta = 1 ponto
  });

  it('deve calcular score 0 quando todas as respostas estão erradas', async () => {
    // Criar novo response para este teste
    const response = await prisma.assessmentResponse.create({
      data: {
        companyId,
        applicationId,
        assessmentId,
        token: `test-token-wrong-${Date.now()}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const result = await submitAssessment(response.token, {
      [questionId]: incorrectChoiceId,
    });

    expect(result.success).toBe(true);
    expect(result.score).toBe(0); // Resposta errada = 0 pontos
  });

  it('deve rejeitar respostas duplicadas (já respondido)', async () => {
    // Primeira resposta
    const result1 = await submitAssessment(validToken, {
      [questionId]: correctChoiceId,
    });
    expect(result1.success).toBe(true);

    // Segunda tentativa com mesmo token
    const result2 = await submitAssessment(validToken, {
      [questionId]: correctChoiceId,
    });
    expect(result2.success).toBe(false);
    expect(result2.error).toContain('respondido');
  });

  it('deve rejeitar respostas com pergunta inválida', async () => {
    const response = await prisma.assessmentResponse.create({
      data: {
        companyId,
        applicationId,
        assessmentId,
        token: `test-token-invalid-q-${Date.now()}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const result = await submitAssessment(response.token, {
      'invalid-question-id': correctChoiceId,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('inválida');
  });

  it('deve rejeitar respostas com choice inválida', async () => {
    const response = await prisma.assessmentResponse.create({
      data: {
        companyId,
        applicationId,
        assessmentId,
        token: `test-token-invalid-c-${Date.now()}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const result = await submitAssessment(response.token, {
      [questionId]: 'invalid-choice-id',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('inválida');
  });

  it('deve rejeitar respostas com token expirado', async () => {
    const response = await prisma.assessmentResponse.create({
      data: {
        companyId,
        applicationId,
        assessmentId,
        token: `test-token-expired-${Date.now()}`,
        expiresAt: new Date(Date.now() - 1000), // Já expirou
      },
    });

    const result = await submitAssessment(response.token, {
      [questionId]: correctChoiceId,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('expirado');
  });
});

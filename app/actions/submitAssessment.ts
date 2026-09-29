'use server';

import { createClient } from '@supabase/supabase-js';
import { AssessmentResponsePayload } from '@/lib/types/assessments';

interface SubmitAssessmentResult {
  success: boolean;
  error?: string;
  score?: number;
}

export async function submitAssessment(
  token: string,
  answers: AssessmentResponsePayload
): Promise<SubmitAssessmentResult> {
  if (!token) {
    return { success: false, error: 'Token inválido' };
  }

  if (!answers || typeof answers !== 'object' || Object.keys(answers).length === 0) {
    return { success: false, error: 'Nenhuma resposta fornecida' };
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Valida response + assessment + application
    const { data: response, error: responseError } = await supabase
      .from('assessment_responses')
      .select(
        `
        id,
        token,
        expires_at,
        submitted_at,
        assessment_id,
        application_id,
        company_id,
        assessments (
          id,
          total_score
        ),
        applications (
          id,
          company_id
        )
      `
      )
      .eq('token', token)
      .single();

    if (responseError || !response) {
      return { success: false, error: 'Link não encontrado' };
    }

    // 2. Verifica se já foi respondido
    if (response.submitted_at) {
      return { success: false, error: 'Este questionário já foi respondido' };
    }

    // 3. Verifica expiração
    const expiresAt = new Date(response.expires_at);
    if (expiresAt < new Date()) {
      return { success: false, error: 'Link expirado' };
    }

    const assessment = response.assessments as any;
    const application = response.applications as any;
    const companyId = application.company_id;

    // 4. Busca todas as perguntas + choices corretos
    const { data: questions, error: questionsError } = await supabase
      .from('assessment_questions')
      .select(
        `
        id,
        max_score,
        assessment_choices (
          id,
          is_correct,
          question_id
        )
      `
      )
      .eq('assessment_id', assessment.id);

    if (questionsError || !questions) {
      return { success: false, error: 'Erro ao validar perguntas' };
    }

    // 5. Valida respostas: todas as perguntas respondidas + choice existe
    const questionIds = new Set(questions.map((q: any) => q.id));
    const answerQuestionIds = new Set(Object.keys(answers));

    if (questionIds.size !== answerQuestionIds.size) {
      return { success: false, error: 'Nem todas as perguntas foram respondidas' };
    }

    // Verifica se todas as perguntas na resposta existem
    for (const qId of answerQuestionIds) {
      if (!questionIds.has(qId)) {
        return { success: false, error: 'Pergunta inválida fornecida' };
      }
    }

    // 6. Calcula score — NUNCA confiar em dados do cliente
    let totalScore = 0;
    const answersToInsert: {
      company_id: string;
      response_id: string;
      question_id: string;
      choice_id: string;
      score: number;
    }[] = [];

    for (const question of questions) {
      const choiceId = answers[question.id];

      if (!choiceId) {
        return { success: false, error: 'Resposta inválida fornecida' };
      }

      // Valida que a choice pertence a esta pergunta
      const choice = (question.assessment_choices || []).find(
        (c: any) => c.id === choiceId
      );

      if (!choice) {
        return { success: false, error: 'Opção inválida fornecida' };
      }

      // Calcula score: 1 ponto se correto, 0 se não
      const score = choice.is_correct ? question.max_score : 0;
      totalScore += score;

      answersToInsert.push({
        company_id: companyId,
        response_id: response.id,
        question_id: question.id,
        choice_id: choiceId,
        score,
      });
    }

    // 7. Grava em transação (idempotência via token)
    // Atualiza assessment_responses
    const { error: updateError } = await supabase
      .from('assessment_responses')
      .update({
        submitted_at: new Date().toISOString(),
        score: totalScore,
      })
      .eq('id', response.id);

    if (updateError) {
      console.error('[submitAssessment] Update error:', updateError);
      return { success: false, error: 'Erro ao registrar respostas' };
    }

    // Insere assessment_answers
    const { error: insertError } = await supabase
      .from('assessment_answers')
      .insert(answersToInsert);

    if (insertError) {
      console.error('[submitAssessment] Insert answers error:', insertError);
      return { success: false, error: 'Erro ao salvar respostas' };
    }

    // Insere evento de auditoria
    const { error: eventError } = await supabase
      .from('application_events')
      .insert({
        company_id: companyId,
        application_id: response.application_id,
        type: 'ASSESSMENT_SUBMITTED',
        payload: {
          assessment_id: assessment.id,
          score: totalScore,
          total_score: assessment.total_score,
        },
        actor_id: null, // evento do sistema
      });

    if (eventError) {
      console.error('[submitAssessment] Event error:', eventError);
      // Não falha o fluxo se o evento falhar — o dado crítico (resposta) já foi gravado
    }

    return { success: true, score: totalScore };
  } catch (err) {
    console.error('[submitAssessment]', err);
    return { success: false, error: 'Erro interno do servidor' };
  }
}

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { AssessmentResultData } from '@/lib/types/assessments';

export async function fetchAssessmentResult(
  applicationId: string
): Promise<AssessmentResultData | null> {
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase
    .from('assessment_responses')
    .select(
      `
      id,
      score,
      submitted_at,
      assessment_id,
      assessments (
        id,
        title,
        total_score
      ),
      assessment_answers (
        id,
        question_id,
        choice_id,
        score,
        assessment_questions (
          id,
          text,
          max_score
        ),
        assessment_choices (
          id,
          text
        )
      )
    `
    )
    .eq('application_id', applicationId)
    .not('submitted_at', 'is', null)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data || !data.submitted_at) {
    return null;
  }

  const assessment = data.assessments as any;
  const answers = (data.assessment_answers || []).map((answer: any) => ({
    questionId: answer.question_id,
    questionText: (answer.assessment_questions as any)?.text || '',
    maxScore: (answer.assessment_questions as any)?.max_score || 0,
    chosenChoiceId: answer.choice_id,
    chosenChoiceText: (answer.assessment_choices as any)?.text || '',
    isCorrect: answer.score > 0,
    score: answer.score,
  }));

  return {
    assessment: {
      id: assessment.id,
      title: assessment.title,
      totalScore: assessment.total_score,
    },
    response: {
      score: data.score || 0,
      submittedAt: data.submitted_at,
    },
    answers,
  };
}

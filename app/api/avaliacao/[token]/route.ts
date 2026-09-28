import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { AssessmentPublicData } from '@/lib/types/assessments';

export const runtime = 'nodejs';

// Route Handler GET: /avaliacao/[token]
// Retorna dados do teste + perguntas + opções (sem isCorrect)
export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const token = params.token;

  if (!token || typeof token !== 'string') {
    return NextResponse.json(
      { error: 'Token inválido' },
      { status: 400 }
    );
  }

  try {
    // Usar service_role para acessar dados (ignora RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Valida response + assessment
    const { data: response, error: responseError } = await supabase
      .from('assessment_responses')
      .select(
        `
        id,
        token,
        expires_at,
        submitted_at,
        assessment_id,
        assessments (
          id,
          title,
          description,
          total_score
        )
      `
      )
      .eq('token', token)
      .single();

    if (responseError || !response) {
      return NextResponse.json(
        { error: 'Link não encontrado ou inválido' },
        { status: 404 }
      );
    }

    // 2. Verifica se já foi respondido
    if (response.submitted_at) {
      return NextResponse.json(
        { error: 'Este questionário já foi respondido' },
        { status: 410 }
      );
    }

    // 3. Verifica expiração
    const expiresAt = new Date(response.expires_at);
    if (expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Link expirado' },
        { status: 410 }
      );
    }

    const assessment = response.assessments as any;

    // 4. Busca perguntas + choices
    const { data: questions, error: questionsError } = await supabase
      .from('assessment_questions')
      .select(
        `
        id,
        text,
        type,
        position,
        max_score,
        assessment_choices (
          id,
          text,
          position
        )
      `
      )
      .eq('assessment_id', assessment.id)
      .order('position', { ascending: true });

    if (questionsError || !questions) {
      return NextResponse.json(
        { error: 'Erro ao carregar perguntas' },
        { status: 500 }
      );
    }

    // 5. Formata resposta (sem isCorrect)
    const data: AssessmentPublicData = {
      id: assessment.id,
      title: assessment.title,
      description: assessment.description,
      totalScore: assessment.total_score,
      questions: questions.map((q: any) => ({
        id: q.id,
        text: q.text,
        type: q.type,
        position: q.position,
        maxScore: q.max_score,
        choices: (q.assessment_choices || []).map((c: any) => ({
          id: c.id,
          text: c.text,
          position: c.position,
          // isCorrect omitido intencionalmente
        })),
      })),
    };

    return NextResponse.json(data);
  } catch (err) {
    console.error('[avaliacao/route]', err);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

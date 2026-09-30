// Pontuação simples (N acertos / N perguntas) — decisão de produto pra
// avaliações não-DISC, calculada 100% no servidor: o cliente nunca envia
// nota, só "pergunta X, escolhi a opção Y".
export type QuizAnswerInput = { questionId: string; choiceId: string; isCorrect: boolean; maxScore: number };

export function calculateQuizResult(answers: QuizAnswerInput[]): { score: number; maxScore: number } {
  const score = answers.reduce((sum, a) => sum + (a.isCorrect ? a.maxScore : 0), 0);
  const maxScore = answers.reduce((sum, a) => sum + a.maxScore, 0);
  return { score, maxScore };
}

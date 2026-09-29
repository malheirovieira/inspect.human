// Tipos públicos para avaliações (Fase 2)

export interface AssessmentPublicData {
  id: string;
  title: string;
  description: string | null;
  totalScore: number;
  questions: AssessmentQuestionPublic[];
}

export interface AssessmentQuestionPublic {
  id: string;
  text: string;
  type: string; // ex: "MULTIPLE_CHOICE"
  position: number;
  maxScore: number;
  choices: AssessmentChoicePublic[];
}

export interface AssessmentChoicePublic {
  id: string;
  text: string;
  position: number;
  // isCorrect sempre omitido no cliente
}

export interface AssessmentResponsePayload {
  [questionId: string]: string; // choiceId
}

export interface AssessmentResultData {
  assessment: {
    id: string;
    title: string;
    totalScore: number;
  };
  response: {
    score: number;
    submittedAt: string; // ISO string
  };
  answers: AssessmentAnswerResult[];
}

export interface AssessmentAnswerResult {
  questionId: string;
  questionText: string;
  maxScore: number;
  chosenChoiceId: string;
  chosenChoiceText: string;
  isCorrect: boolean;
  score: number;
}

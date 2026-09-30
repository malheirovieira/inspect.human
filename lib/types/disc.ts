export type DiscPublicQuestion = {
  id: string;
  position: number;
  section: "COMPETENCIAS" | "DISC";
  dimension: string;
  text: string;
};

export type QuizPublicChoice = { id: string; position: number; text: string };
export type QuizPublicQuestion = { id: string; position: number; text: string; choices: QuizPublicChoice[] };

export type PublicAssessmentData =
  | { type: "DISC"; title: string; questions: DiscPublicQuestion[] }
  | { type: "QUIZ"; title: string; questions: QuizPublicQuestion[] };

import { COMPETENCIA_DIMENSIONS, DISC_DIMENSIONS } from "./questions";

// Fórmula exata da planilha: média das notas (1-5) da dimensão,
// reescalada de [1,5] pra [0,100]. Arredondado a 1 casa decimal.
function calcScore(notes: number[]): number {
  if (notes.length === 0) return 0;
  const media = notes.reduce((a, b) => a + b, 0) / notes.length;
  return Math.round(((media - 1) / 4) * 100 * 10) / 10;
}

function calcNivel(score: number): "Baixo" | "Médio" | "Alto" {
  if (score < 60) return "Baixo";
  if (score < 80) return "Médio";
  return "Alto";
}

// Se a distância entre 1º e 2º lugar for grande (>20 pontos), o perfil é
// só a dimensão dominante ("D"); senão, as duas mais fortes ("DC", "IS"...).
function calcPerfilDisc(d: number, i: number, s: number, c: number): string {
  const dims = [
    { label: "D", score: d },
    { label: "I", score: i },
    { label: "S", score: s },
    { label: "C", score: c },
  ].sort((a, b) => b.score - a.score);

  if (dims[0].score - dims[1].score > 20) return dims[0].label;
  return dims[0].label + dims[1].label;
}

export type DiscAnswerInput = { dimension: string; section: "COMPETENCIAS" | "DISC"; score: number };

export type DiscResult = {
  scoreEnergia: number;
  scoreResponsabilidade: number;
  scoreEngajamento: number;
  scoreTrabalhoEquipe: number;
  scoreComprometimento: number;
  scoreAprendizagem: number;
  scoreGeral: number;
  nivelGeral: string;
  scoreD: number;
  scoreI: number;
  scoreS: number;
  scoreC: number;
  perfilDisc: string;
};

const COMPETENCIA_FIELD: Record<(typeof COMPETENCIA_DIMENSIONS)[number], keyof DiscResult> = {
  Energia: "scoreEnergia",
  Responsabilidade: "scoreResponsabilidade",
  Engajamento: "scoreEngajamento",
  "Trabalho em Equipe": "scoreTrabalhoEquipe",
  Comprometimento: "scoreComprometimento",
  "Facilidade de Aprendizagem": "scoreAprendizagem",
};

export function calculateDiscResult(answers: DiscAnswerInput[]): DiscResult {
  const byDim = (dim: string, sec: "COMPETENCIAS" | "DISC") =>
    answers.filter((a) => a.dimension === dim && a.section === sec).map((a) => a.score);

  const competenciaScores = {} as Record<keyof DiscResult, number>;
  for (const dim of COMPETENCIA_DIMENSIONS) {
    competenciaScores[COMPETENCIA_FIELD[dim]] = calcScore(byDim(dim, "COMPETENCIAS"));
  }

  const scoreGeral =
    Math.round(
      (Object.values(competenciaScores).reduce((a, b) => a + b, 0) / COMPETENCIA_DIMENSIONS.length) * 10
    ) / 10;

  const [scoreD, scoreI, scoreS, scoreC] = DISC_DIMENSIONS.map((dim) => calcScore(byDim(dim, "DISC")));

  return {
    scoreEnergia: competenciaScores.scoreEnergia,
    scoreResponsabilidade: competenciaScores.scoreResponsabilidade,
    scoreEngajamento: competenciaScores.scoreEngajamento,
    scoreTrabalhoEquipe: competenciaScores.scoreTrabalhoEquipe,
    scoreComprometimento: competenciaScores.scoreComprometimento,
    scoreAprendizagem: competenciaScores.scoreAprendizagem,
    scoreGeral,
    nivelGeral: calcNivel(scoreGeral),
    scoreD,
    scoreI,
    scoreS,
    scoreC,
    perfilDisc: calcPerfilDisc(scoreD, scoreI, scoreS, scoreC),
  };
}

// As 60 afirmações fixas da Avaliação Comportamental DISC (planilha da
// empresa) — sem CRUD, usadas só pelo seed (scripts/seedDisc.ts) ao criar o
// DiscAssessment de cada empresa. Ordem = position (1 a 60).
export type DiscSeedQuestion = {
  position: number;
  section: "COMPETENCIAS" | "DISC";
  dimension: string;
  text: string;
};

export const DISC_QUESTIONS: DiscSeedQuestion[] = [
  // COMPETÊNCIAS — Energia (1-6)
  { position: 1, section: "COMPETENCIAS", dimension: "Energia", text: "Mantém um ritmo de trabalho consistente ao longo do dia." },
  { position: 2, section: "COMPETENCIAS", dimension: "Energia", text: "Consegue sustentar foco mesmo em tarefas repetitivas." },
  { position: 3, section: "COMPETENCIAS", dimension: "Energia", text: "Demonstra disposição para assumir picos de demanda." },
  { position: 4, section: "COMPETENCIAS", dimension: "Energia", text: "Recupera-se rapidamente após contratempos." },
  { position: 5, section: "COMPETENCIAS", dimension: "Energia", text: "Trabalha bem sob pressão sem perder qualidade." },
  { position: 6, section: "COMPETENCIAS", dimension: "Energia", text: "Mostra proatividade para iniciar atividades sem ser lembrado(a)." },
  // COMPETÊNCIAS — Responsabilidade (7-12)
  { position: 7, section: "COMPETENCIAS", dimension: "Responsabilidade", text: "Cumpre prazos acordados com confiabilidade." },
  { position: 8, section: "COMPETENCIAS", dimension: "Responsabilidade", text: "Assume consequências por erros e busca corrigir." },
  { position: 9, section: "COMPETENCIAS", dimension: "Responsabilidade", text: "Organiza tarefas e prioriza o que é mais importante." },
  { position: 10, section: "COMPETENCIAS", dimension: "Responsabilidade", text: "Entrega com atenção a detalhes e qualidade." },
  { position: 11, section: "COMPETENCIAS", dimension: "Responsabilidade", text: "Comunica riscos/atrasos com antecedência." },
  { position: 12, section: "COMPETENCIAS", dimension: "Responsabilidade", text: "Mantém confidencialidade e ética no trabalho." },
  // COMPETÊNCIAS — Engajamento (13-18)
  { position: 13, section: "COMPETENCIAS", dimension: "Engajamento", text: "Demonstra interesse genuíno pelos objetivos da área." },
  { position: 14, section: "COMPETENCIAS", dimension: "Engajamento", text: "Contribui com ideias para melhorar processos." },
  { position: 15, section: "COMPETENCIAS", dimension: "Engajamento", text: "Busca entender o impacto do próprio trabalho no resultado." },
  { position: 16, section: "COMPETENCIAS", dimension: "Engajamento", text: "Mantém atitude positiva e colaborativa no dia a dia." },
  { position: 17, section: "COMPETENCIAS", dimension: "Engajamento", text: "Participa ativamente de reuniões e alinhamentos." },
  { position: 18, section: "COMPETENCIAS", dimension: "Engajamento", text: "Mostra iniciativa para resolver problemas, não apenas apontá-los." },
  // COMPETÊNCIAS — Trabalho em Equipe (19-24)
  { position: 19, section: "COMPETENCIAS", dimension: "Trabalho em Equipe", text: "Escuta ativamente e considera perspectivas dos colegas." },
  { position: 20, section: "COMPETENCIAS", dimension: "Trabalho em Equipe", text: "Compartilha informações e ajuda quando necessário." },
  { position: 21, section: "COMPETENCIAS", dimension: "Trabalho em Equipe", text: "Dá e recebe feedback de forma construtiva." },
  { position: 22, section: "COMPETENCIAS", dimension: "Trabalho em Equipe", text: "Respeita acordos e combinações do time." },
  { position: 23, section: "COMPETENCIAS", dimension: "Trabalho em Equipe", text: "Gerencia conflitos com maturidade e foco em solução." },
  { position: 24, section: "COMPETENCIAS", dimension: "Trabalho em Equipe", text: "Colabora para decisões coletivas e compromete-se com elas." },
  // COMPETÊNCIAS — Comprometimento (25-30)
  { position: 25, section: "COMPETENCIAS", dimension: "Comprometimento", text: "Cumpre o que promete e acompanha até a conclusão." },
  { position: 26, section: "COMPETENCIAS", dimension: "Comprometimento", text: "Demonstra alinhamento com valores e cultura da empresa." },
  { position: 27, section: "COMPETENCIAS", dimension: "Comprometimento", text: "Mantém consistência mesmo quando não há supervisão direta." },
  { position: 28, section: "COMPETENCIAS", dimension: "Comprometimento", text: "Mostra disciplina e constância em metas de médio prazo." },
  { position: 29, section: "COMPETENCIAS", dimension: "Comprometimento", text: "Assume responsabilidades além do mínimo esperado quando necessário." },
  { position: 30, section: "COMPETENCIAS", dimension: "Comprometimento", text: "Procura elevar o padrão de entrega continuamente." },
  // COMPETÊNCIAS — Facilidade de Aprendizagem (31-36)
  { position: 31, section: "COMPETENCIAS", dimension: "Facilidade de Aprendizagem", text: "Aprende novas ferramentas/processos com rapidez." },
  { position: 32, section: "COMPETENCIAS", dimension: "Facilidade de Aprendizagem", text: "Faz perguntas relevantes e busca entendimento profundo." },
  { position: 33, section: "COMPETENCIAS", dimension: "Facilidade de Aprendizagem", text: "Aplica aprendizados em situações diferentes (transferência)." },
  { position: 34, section: "COMPETENCIAS", dimension: "Facilidade de Aprendizagem", text: "Aceita mudanças e adapta-se sem grande resistência." },
  { position: 35, section: "COMPETENCIAS", dimension: "Facilidade de Aprendizagem", text: "Busca feedback para evoluir e corrige rota rapidamente." },
  { position: 36, section: "COMPETENCIAS", dimension: "Facilidade de Aprendizagem", text: "Documenta/compartilha aprendizados com o time." },
  // DISC — Dominância D (37-42)
  { position: 37, section: "DISC", dimension: "D", text: "Gosta de tomar decisões rápidas em ambientes incertos." },
  { position: 38, section: "DISC", dimension: "D", text: "Sente-se confortável em assumir liderança quando necessário." },
  { position: 39, section: "DISC", dimension: "D", text: "Prefere desafios e metas agressivas." },
  { position: 40, section: "DISC", dimension: "D", text: "Enfrenta problemas de forma direta e objetiva." },
  { position: 41, section: "DISC", dimension: "D", text: "Busca autonomia para executar e decidir." },
  { position: 42, section: "DISC", dimension: "D", text: "Tende a competir para alcançar resultados." },
  // DISC — Influência I (43-48)
  { position: 43, section: "DISC", dimension: "I", text: "Gosta de interagir e persuadir pessoas." },
  { position: 44, section: "DISC", dimension: "I", text: "Sente-se energizado(a) ao apresentar ideias em público." },
  { position: 45, section: "DISC", dimension: "I", text: "Cria conexões com facilidade em novos ambientes." },
  { position: 46, section: "DISC", dimension: "I", text: "Tende a estimular o entusiasmo do grupo." },
  { position: 47, section: "DISC", dimension: "I", text: "Prefere trabalho com alto nível de relacionamento." },
  { position: 48, section: "DISC", dimension: "I", text: "Usa comunicação para engajar e mobilizar." },
  // DISC — Estabilidade S (49-54)
  { position: 49, section: "DISC", dimension: "S", text: "Prefere previsibilidade e rotinas bem definidas." },
  { position: 50, section: "DISC", dimension: "S", text: "Mantém calma e paciência em situações tensas." },
  { position: 51, section: "DISC", dimension: "S", text: "Valoriza cooperação e harmonia no grupo." },
  { position: 52, section: "DISC", dimension: "S", text: "Gosta de apoiar e dar suporte aos outros." },
  { position: 53, section: "DISC", dimension: "S", text: "Trabalha bem com processos e constância." },
  { position: 54, section: "DISC", dimension: "S", text: "Evita mudanças bruscas, preferindo transições graduais." },
  // DISC — Conformidade C (55-60)
  { position: 55, section: "DISC", dimension: "C", text: "Valoriza precisão, regras e padrões de qualidade." },
  { position: 56, section: "DISC", dimension: "C", text: "Gosta de analisar dados antes de decidir." },
  { position: 57, section: "DISC", dimension: "C", text: "Prefere instruções claras e critérios objetivos." },
  { position: 58, section: "DISC", dimension: "C", text: "Percebe inconsistências e riscos com facilidade." },
  { position: 59, section: "DISC", dimension: "C", text: "Documenta e segue procedimentos com rigor." },
  { position: 60, section: "DISC", dimension: "C", text: "Busca excelência técnica e melhoria contínua." },
];

export const COMPETENCIA_DIMENSIONS = [
  "Energia",
  "Responsabilidade",
  "Engajamento",
  "Trabalho em Equipe",
  "Comprometimento",
  "Facilidade de Aprendizagem",
] as const;

export const DISC_DIMENSIONS = ["D", "I", "S", "C"] as const;

export const DISC_DIMENSION_LABELS: Record<(typeof DISC_DIMENSIONS)[number], string> = {
  D: "Dominância",
  I: "Influência",
  S: "Estabilidade",
  C: "Conformidade",
};

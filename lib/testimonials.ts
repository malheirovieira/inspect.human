// ⚠ FICTÍCIO — depoimentos PROVISÓRIOS da faixa "O que dizem sobre o
// Inspect Talent" (tela Início). Pessoas e empresas INVENTADAS; nenhuma
// empresa real. Serão SUBSTITUÍDOS pela funcionalidade de comentários
// reais, com esta MESMA estrutura de dados (Testimonial). NÃO podem ser
// exibidos a clientes reais — ver CONTEXT.md, "Pendências antes do
// primeiro cliente".

export type TestimonialSegment = "Indústria" | "Logística" | "Varejo" | "Serviços";

export type Testimonial = {
  id: string;
  segment: TestimonialSegment;
  text: string;
  name: string;
  role: string;
  company: string;
  // Futuro (comentários reais): foto enviada pela própria pessoa. Sem isso,
  // o card mostra as iniciais — nunca foto de pessoa real ou banco de imagens.
  avatarUrl?: string;
  // Contagens iniciais (hoje fictícias; no futuro vêm do banco).
  likes: number;
  comments: number;
};

export const TESTIMONIALS: readonly Testimonial[] = [
  {
    // FICTÍCIO
    id: "ficticio-1",
    segment: "Indústria",
    text: "A triagem que levava uma semana inteira agora fecha em dois dias. O resumo de cada currículo já chega pronto para a gente decidir quem chamar.",
    name: "Renata Albuquerque",
    role: "Coordenadora de RH",
    company: "Metalúrgica Horizonte Exemplo",
    likes: 24,
    comments: 5,
  },
  {
    // FICTÍCIO
    id: "ficticio-2",
    segment: "Logística",
    text: "Com as vagas organizadas por etapa no kanban, ninguém mais se perde em planilha. Todo mundo do time sabe em que ponto está cada candidato.",
    name: "Marcos Tavares",
    role: "Analista de Recrutamento",
    company: "Transportes Rota Fictícia",
    likes: 17,
    comments: 3,
  },
  {
    // FICTÍCIO
    id: "ficticio-3",
    segment: "Varejo",
    text: "O banco de talentos virou nossa primeira parada: abriu vaga nova, filtramos por competência e já temos gente boa que se candidatou antes.",
    name: "Juliana Prado",
    role: "Gerente de Loja",
    company: "Mercado Bom Preço Imaginário",
    likes: 31,
    comments: 8,
  },
  {
    // FICTÍCIO
    id: "ficticio-4",
    segment: "Serviços",
    text: "O resumo por IA me ajuda a ler cinquenta currículos numa manhã. A decisão continua sendo minha, mas chego nela muito mais rápido.",
    name: "Felipe Nogueira",
    role: "Sócio-diretor",
    company: "Consultoria Pontual Exemplo",
    likes: 12,
    comments: 2,
  },
  {
    // FICTÍCIO
    id: "ficticio-5",
    segment: "Indústria",
    text: "Antes cada gestor mandava currículo por e-mail. Hoje está tudo no mesmo lugar, com o histórico de cada candidato à vista de quem precisa.",
    name: "Cláudio Menezes",
    role: "Gerente Industrial",
    company: "Plásticos Vale Inventado",
    likes: 9,
    comments: 1,
  },
  {
    // FICTÍCIO
    id: "ficticio-6",
    segment: "Logística",
    text: "Na alta temporada abrimos vinte vagas de uma vez. A página pública de candidatura aguentou o volume e a triagem não virou um gargalo.",
    name: "Patrícia Siqueira",
    role: "Supervisora de Operações",
    company: "Armazéns Ponto Norte Exemplo",
    likes: 27,
    comments: 6,
  },
  {
    // FICTÍCIO
    id: "ficticio-7",
    segment: "Varejo",
    text: "Gosto de ver no kanban quem está parado em cada etapa. Ficou fácil lembrar de dar retorno para todo mundo, inclusive para quem não passou.",
    name: "Eduardo Lins",
    role: "Coordenador de Pessoas",
    company: "Rede Farmácia Saúde Fictícia",
    likes: 15,
    comments: 4,
  },
  {
    // FICTÍCIO
    id: "ficticio-8",
    segment: "Serviços",
    text: "As tags de competência do resumo me poupam tempo: bato o olho e sei se vale ler o currículo inteiro com calma ou não.",
    name: "Camila Duarte",
    role: "Recrutadora",
    company: "Clínica Bem-Estar Imaginária",
    likes: 20,
    comments: 3,
  },
  {
    // FICTÍCIO
    id: "ficticio-9",
    segment: "Indústria",
    text: "Somos uma empresa pequena, sem RH dedicado. O sistema organizou um processo que antes dependia só da memória do dono.",
    name: "Sérgio Rocha",
    role: "Sócio-proprietário",
    company: "Marcenaria Arte Exemplo",
    likes: 11,
    comments: 2,
  },
  {
    // FICTÍCIO
    id: "ficticio-10",
    segment: "Serviços",
    text: "Quando uma vaga fecha, os bons candidatos ficam no banco de talentos. Já contratamos duas pessoas assim sem abrir processo novo.",
    name: "Aline Carvalho",
    role: "Analista de Departamento Pessoal",
    company: "Contabilidade Soma Fictícia",
    likes: 18,
    comments: 5,
  },
];

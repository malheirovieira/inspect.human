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
];

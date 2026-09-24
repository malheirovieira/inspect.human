import { PDFDocument, StandardFonts } from "pdf-lib";

// Currículos FICTÍCIOS gerados em tempo de teste (nenhum PDF binário no
// repositório). Qualquer semelhança com pessoa real é coincidência.

export const FICTITIOUS_CANDIDATE_NAME = "Marina Exemplo Souza";

export const FICTITIOUS_RESUME_LINES = [
  "MARINA EXEMPLO SOUZA",
  "Analista de Dados",
  "Brasileira, casada, 34 anos",
  "Data de nascimento: 12/03/1991",
  "E-mail: marina.exemplo@email.test | Telefone: (11) 91234-5678",
  "CPF: 123.456.789-09 | RG: 12.345.678-9 SSP/SP",
  "Endereço: Rua das Flores Fictícias, 123 - Bairro Jardim Teste",
  "São Paulo - SP, CEP 01234-567",
  "linkedin.com/in/marina-exemplo | https://github.com/marinaexemplo",
  "",
  "RESUMO",
  "Analista de dados com experiência em varejo e serviços financeiros, atuando com",
  "automação de relatórios, modelagem de indicadores e apoio a times comerciais.",
  "",
  "EXPERIÊNCIA",
  "Analista de Dados Pleno - Empresa Exemplo Ltda. (2021 - 2024)",
  "Construção de painéis em Power BI e rotinas de ETL em Python e SQL.",
  "Analista de BI Júnior - Comércio Fictício S.A. (2018 - 2021)",
  "Automação de relatórios semanais em Excel e SQL para a diretoria comercial.",
  "",
  "FORMAÇÃO",
  "Bacharelado em Estatística - Universidade Fictícia (2014 - 2018)",
  "",
  "COMPETÊNCIAS",
  "SQL, Python, Power BI, Excel avançado, ETL, Modelagem de dados",
];

export async function textResumePdf(lines: string[] = FICTITIOUS_RESUME_LINES): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([595, 842]);
  let y = 800;
  for (const line of lines) {
    page.drawText(line, { x: 40, y, size: 10, font });
    y -= 16;
  }
  return doc.save();
}

// PNG 1x1 — simula currículo digitalizado (só imagem, nenhum texto).
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

export async function imageOnlyPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const png = await doc.embedPng(TINY_PNG);
  const page = doc.addPage([595, 842]);
  page.drawImage(png, { x: 0, y: 0, width: 595, height: 842 });
  return doc.save();
}

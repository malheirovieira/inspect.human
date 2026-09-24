import { describe, expect, it } from "vitest";
import { AI_INPUT_MAX_CHARS, redactResumeText, truncateForAi } from "@/lib/ai/redact";
import { FICTITIOUS_CANDIDATE_NAME, FICTITIOUS_RESUME_LINES } from "../fixtures/resumes";

const redact = (text: string, candidateName?: string) => redactResumeText(text, { candidateName });

describe("remoção de dados de contato e pessoais", () => {
  it.each([
    ["e-mail", "Contato: maria.silva+cv@empresa.com.br", "[E-MAIL]"],
    ["telefone com DDD e máscara", "Cel: (11) 91234-5678", "[TELEFONE]"],
    ["telefone com +55", "WhatsApp +55 21 99876 5432", "[TELEFONE]"],
    ["telefone fixo", "Tel.: 11 3456-7890", "[TELEFONE]"],
    ["telefone só dígitos", "Fone 11912345678", "[TELEFONE]"],
    ["CPF com máscara", "CPF 123.456.789-09", "[CPF]"],
    ["CPF só dígitos", "CPF: 12345678909", "[NÚMERO]"],
    ["RG com órgão emissor", "RG: 12.345.678-9 SSP/SP", "[RG]"],
    ["CEP", "01234-567", "[ENDEREÇO]"],
    ["link com protocolo", "Portfólio: https://meusite.dev/projetos", "[LINK]"],
    ["LinkedIn sem protocolo", "linkedin.com/in/fulano-de-tal", "[LINK]"],
    ["www", "www.portfoliopessoal.com.br", "[LINK]"],
    ["@handle", "Instagram @fulano.design", "[LINK]"],
  ])("%s", (_label, input, marker) => {
    const out = redact(input);
    expect(out).toContain(marker);
    expect(out).not.toMatch(/\d{4}-\d{4}|@\w|\.com|\d{3}\.\d{3}\.\d{3}|\d{8,}/);
  });

  it.each([
    "Endereço: Av. Paulista, 1000 - apto 12",
    "Rua das Acácias, 45",
    "Bairro: Centro",
    "Data de nascimento: 01/02/1990",
    "Nascida em 01/02/1990",
    "Idade: 34 anos",
    "Estado civil: solteiro",
    "Sexo: feminino",
    "Nacionalidade: brasileira",
    "Brasileira, casada, 34 anos",
  ])("remove a linha inteira: %s", (line) => {
    const out = redact(`Antes\n${line}\nDepois`);
    expect(out).not.toContain(line);
    expect(out).toMatch(/^Antes\n\[(ENDEREÇO|DADO PESSOAL)\]\nDepois$/);
  });

  it("remove o nome do candidato, com e sem acento/maiúsculas", () => {
    const out = redact("JOÃO DA SILVA\nJoao da Silva trabalhou...\nJoão Silva, analista", "João da Silva");
    expect(out).not.toMatch(/jo[ãa]o/i);
    expect(out).toBe("[NOME]\n[NOME] trabalhou...\n[NOME], analista");
  });

  it("não remove experiência, datas de cargo nem nomes de empresa", () => {
    const text = [
      "Analista de Dados (2019 - 2021)",
      "Coordenador 01/2018 a 12/2020",
      "5 anos de experiência em vendas",
      "Empresa Rua Nova Comércio Ltda.",
      "Jovem Aprendiz - Banco Exemplo",
    ].join("\n");
    expect(redact(text)).toBe(text);
  });

  it("currículo fictício completo: nenhum dado de contato ou pessoal sobra", () => {
    const out = redact(FICTITIOUS_RESUME_LINES.join("\n"), FICTITIOUS_CANDIDATE_NAME);
    for (const leaked of [
      "marina",
      "91234",
      "123.456",
      "12.345.678",
      "Flores",
      "01234-567",
      "github",
      "linkedin",
      "casada",
      "1991",
    ]) {
      expect(out.toLowerCase()).not.toContain(leaked.toLowerCase());
    }
    // conteúdo profissional preservado
    expect(out).toContain("Analista de Dados Pleno - Empresa Exemplo Ltda. (2021 - 2024)");
    expect(out).toContain("Bacharelado em Estatística");
  });
});

describe("limite de tamanho do texto enviado", () => {
  it("não mexe em texto curto", () => {
    expect(truncateForAi("curto")).toBe("curto");
  });

  it("corta em fim de parágrafo e sinaliza", () => {
    const paragraph = `${"x".repeat(999)}\n\n`;
    const out = truncateForAi(paragraph.repeat(20));
    expect(out.length).toBeLessThanOrEqual(AI_INPUT_MAX_CHARS + 20);
    expect(out.endsWith("\n[texto truncado]")).toBe(true);
    expect(out.replace("\n[texto truncado]", "").endsWith("x")).toBe(true);
  });
});

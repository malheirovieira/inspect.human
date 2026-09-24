import { describe, expect, it } from "vitest";
import { AI_BLOCK_REASON_LABELS, getAiBlockReason } from "@/lib/ai/availability";
import { parseAiConfig } from "@/lib/ai/config";
import { createAiProvider } from "@/lib/ai/providers";
import { MOCK_RESULT } from "@/lib/ai/providers/mock";
import { SCREENING_SYSTEM_PROMPT, dedupeTags, parseScreeningOutput } from "@/lib/ai/screening";

const valid = () => structuredClone(MOCK_RESULT) as Record<string, unknown>;
const parse = (obj: unknown) => parseScreeningOutput(JSON.stringify(obj));

describe("validação da resposta da IA", () => {
  it("aceita o exemplo do mock (mesmo formato do real)", () => {
    const out = parse(valid());
    expect(out.ok).toBe(true);
  });

  it("aceita JSON embrulhado em ```json", () => {
    expect(parseScreeningOutput("```json\n" + JSON.stringify(valid()) + "\n```").ok).toBe(true);
  });

  it("recusa texto que não é JSON", () => {
    expect(parseScreeningOutput("Claro! Aqui está o resumo…")).toMatchObject({ ok: false });
    expect(parseScreeningOutput("")).toMatchObject({ ok: false });
  });

  it("resumo com mais de 3 frases é recusado", () => {
    expect(parse({ ...valid(), resumo: "Um. Dois. Três. Quatro." })).toMatchObject({ ok: false });
  });

  it("mais de 8 competências ou 3 cargos é recusado", () => {
    expect(parse({ ...valid(), competencias: Array.from({ length: 9 }, (_, i) => `T${i}`) }).ok).toBe(false);
    expect(parse({ ...valid(), ultimosCargos: Array.from({ length: 4 }, () => ({ cargo: "A", empresa: null })) }).ok).toBe(false);
  });

  it("campo a mais ou faltando é recusado", () => {
    expect(parse({ ...valid(), nota: 9 }).ok).toBe(false);
    const { formacao: _f, ...semFormacao } = valid();
    expect(parse(semFormacao).ok).toBe(false);
  });

  it("aceita nulls quando a informação não está no currículo", () => {
    const out = parse({ ...valid(), experienciaAnos: null, experienciaBase: "qualquer", formacao: null, ultimosCargos: [] });
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.data.experienciaAnos).toBeNull();
      expect(out.data.experienciaBase).toBeNull(); // sem número, sem base
    }
  });

  it("normaliza: arredonda experiência, tira tags duplicadas, string vazia vira null", () => {
    const out = parse({ ...valid(), experienciaAnos: 6.66, competencias: ["SQL", "sql", " Python ", "Pýthon"], formacao: "  " });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.data.experienciaAnos).toBe(6.7);
    expect(out.data.competencias).toEqual(["SQL", "Python"]);
    expect(out.data.formacao).toBeNull();
  });

  it.each([
    ["idade", "Profissional de 34 anos de idade com experiência em dados."],
    ["estado civil", "Analista casada, com experiência em dados."],
    ["gênero", "Candidata do gênero feminino com experiência em dados."],
    ["deficiência", "Pessoa com deficiência, atua com dados."],
    ["recomendação", "Recomendo avançar com a candidata, perfil muito bom."],
    ["candidato ideal", "Candidata ideal para a vaga de dados."],
    ["nota", "Perfil com nota 9 em aderência técnica."],
  ])("recusa resumo que menciona %s", (_label, resumo) => {
    expect(parse({ ...valid(), resumo })).toMatchObject({ ok: false });
  });

  it("não confunde termos proibidos com fatos profissionais", () => {
    const out = parse({
      ...valid(),
      resumo: "Enfermeira com atuação em saúde da mulher e emissão de nota fiscal no setor administrativo.",
      competencias: ["Saúde da Mulher", "Nota fiscal"],
      ultimosCargos: [{ cargo: "Jovem Aprendiz", empresa: "Universidade Exemplo" }],
    });
    expect(out.ok).toBe(true);
  });

  it("dedupeTags ignora acento e caixa, mantém a primeira grafia", () => {
    expect(dedupeTags(["Gestão", "gestao", "GESTÃO de pessoas", "Gestão  de   pessoas"])).toEqual(["Gestão", "GESTÃO de pessoas"]);
  });

  it("prompt traz as proibições obrigatórias", () => {
    for (const term of ["idade", "gênero", "raça", "religião", "estado civil", "saúde", "deficiência", "aparência", "nota", "ranking", "aprovar", "reprovar", "null"]) {
      expect(SCREENING_SYSTEM_PROMPT).toContain(term);
    }
  });
});

describe("configuração do provedor", () => {
  it("sem nada configurado: mock, sem liberar dados reais", () => {
    expect(parseAiConfig({})).toEqual({ provider: "mock", model: "mock", apiKey: null, allowRealData: false, error: null });
  });

  it("AI_ALLOW_REAL_DATA só é true com o valor exato 'true'", () => {
    expect(parseAiConfig({ AI_ALLOW_REAL_DATA: "true" }).allowRealData).toBe(true);
    expect(parseAiConfig({ AI_ALLOW_REAL_DATA: " TRUE " }).allowRealData).toBe(true);
    for (const v of ["1", "yes", "sim", "false", ""]) expect(parseAiConfig({ AI_ALLOW_REAL_DATA: v }).allowRealData).toBe(false);
  });

  it("gemini/openai exigem chave e modelo, sem cair pra mock em silêncio", () => {
    expect(parseAiConfig({ AI_PROVIDER: "gemini" }).error).toMatch(/GEMINI_API_KEY e AI_MODEL/);
    expect(parseAiConfig({ AI_PROVIDER: "openai", OPENAI_API_KEY: "k" }).error).toMatch(/AI_MODEL/);
    expect(parseAiConfig({ AI_PROVIDER: "gemnii" }).error).toMatch(/inválido/);
    const ok = parseAiConfig({ AI_PROVIDER: "gemini", GEMINI_API_KEY: "k", AI_MODEL: "m" });
    expect(ok).toMatchObject({ provider: "gemini", model: "m", apiKey: "k", error: null });
  });

  it("mensagem de erro nunca contém a chave", () => {
    const cfg = parseAiConfig({ AI_PROVIDER: "openai", OPENAI_API_KEY: "sk-segredo-123" });
    expect(cfg.error).not.toContain("sk-segredo-123");
  });

  it("com erro de configuração não há provedor (nenhuma chamada)", () => {
    expect(createAiProvider(parseAiConfig({ AI_PROVIDER: "gemini" }))).toBeNull();
    expect(createAiProvider(parseAiConfig({}))?.isMock).toBe(true);
  });

  it("mock devolve resposta válida no formato real", async () => {
    const provider = createAiProvider(parseAiConfig({}), { mockDelayMs: 0 })!;
    const raw = await provider.generate({ system: "", input: "", schemaName: "x", jsonSchema: {} });
    expect(parseScreeningOutput(raw).ok).toBe(true);
  });
});

describe("bloqueio por AI_ALLOW_REAL_DATA e demais regras", () => {
  const base = { isTest: false, allowRealData: true, companyEnabled: true, hasAiConsent: true };

  it("com AI_ALLOW_REAL_DATA=false, candidato real NUNCA é processado", () => {
    expect(getAiBlockReason({ ...base, allowRealData: false })).toBe("REAL_DATA_BLOCKED");
    // mesmo com chave da empresa e consentimento
    expect(getAiBlockReason({ ...base, allowRealData: false, companyEnabled: true, hasAiConsent: true })).toBe("REAL_DATA_BLOCKED");
  });

  it("candidato de teste passa com AI_ALLOW_REAL_DATA=false, sem chave nem consentimento", () => {
    expect(getAiBlockReason({ isTest: true, allowRealData: false, companyEnabled: false, hasAiConsent: false })).toBeNull();
  });

  it("dados reais liberados ainda exigem chave da empresa e consentimento", () => {
    expect(getAiBlockReason({ ...base, companyEnabled: false })).toBe("COMPANY_DISABLED");
    expect(getAiBlockReason({ ...base, hasAiConsent: false })).toBe("NO_CONSENT");
    expect(getAiBlockReason(base)).toBeNull();
  });

  it("textos da interface falam da ferramenta e nunca usam 'elegível'", () => {
    expect(AI_BLOCK_REASON_LABELS).toEqual({
      NO_CONSENT: "Análise por IA não autorizada pelo candidato",
      COMPANY_DISABLED: "Triagem com IA desativada",
      REAL_DATA_BLOCKED: "Triagem com IA indisponível",
    });
    for (const text of Object.values(AI_BLOCK_REASON_LABELS)) expect(text).not.toMatch(/eleg[ií]vel/i);
  });
});

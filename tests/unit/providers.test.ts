import { describe, expect, it, vi } from "vitest";
import { createGeminiProvider } from "@/lib/ai/providers/gemini";
import { createOpenAiProvider } from "@/lib/ai/providers/openai";
import { PermanentTaskError, TransientTaskError } from "@/lib/tasks/errors";

const REQ = { system: "instruções", input: "texto do currículo", schemaName: "triagem", jsonSchema: { type: "object" } };

function fakeFetch(status: number, body: unknown, headers: Record<string, string> = {}) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status, headers }));
}

const providers = [
  {
    name: "Gemini",
    make: (f: typeof fetch) => createGeminiProvider({ apiKey: "chave-gemini", model: "modelo-g", fetch: f }),
    // Envelope real da Interactions API (confirmado em 2026-09-24).
    okBody: {
      status: "completed",
      object: "interaction",
      steps: [
        { type: "thought", signature: "abc" },
        { type: "model_output", content: [{ type: "text", text: '{"ok":true}' }] },
      ],
    },
  },
  {
    name: "OpenAI",
    make: (f: typeof fetch) => createOpenAiProvider({ apiKey: "chave-openai", model: "modelo-o", fetch: f }),
    okBody: { output: [{ type: "message", content: [{ type: "output_text", text: '{"ok":true}' }] }] },
  },
];

describe.each(providers)("provedor $name", ({ make, okBody }) => {
  it("devolve o texto da resposta e pede para não guardar", async () => {
    const f = fakeFetch(200, okBody);
    expect(await make(f).generate(REQ)).toBe('{"ok":true}');

    const [, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(body.store).toBe(false);
    expect(JSON.stringify(body)).not.toMatch(/chave-/); // chave só no header
    expect(JSON.stringify(body)).toContain("texto do currículo"); // só texto, nunca arquivo
  });

  it("HTTP 429 vira erro temporário com o Retry-After", async () => {
    const err = await make(fakeFetch(429, { error: {} }, { "retry-after": "20" })).generate(REQ).catch((e) => e);
    expect(err).toBeInstanceOf(TransientTaskError);
    expect(err.retryAfterMs).toBe(20_000);
  });

  it("HTTP 503 também é temporário", async () => {
    const err = await make(fakeFetch(503, {})).generate(REQ).catch((e) => e);
    expect(err).toBeInstanceOf(TransientTaskError);
  });

  it("chave inválida (401) é permanente", async () => {
    const err = await make(fakeFetch(401, { error: { code: "invalid_api_key" } })).generate(REQ).catch((e) => e);
    expect(err).toBeInstanceOf(PermanentTaskError);
  });

  it("erro 500 é falha comum (nova tentativa normal)", async () => {
    const err = await make(fakeFetch(500, {})).generate(REQ).catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err).not.toBeInstanceOf(TransientTaskError);
    expect(err).not.toBeInstanceOf(PermanentTaskError);
  });

  it("mensagem de erro não carrega o corpo da requisição", async () => {
    const err = await make(fakeFetch(400, { error: { message: "texto do currículo ecoado" } })).generate(REQ).catch((e) => e);
    expect(String(err.message)).not.toContain("currículo");
  });
});

describe("detalhes por provedor", () => {
  it("Gemini: usa o retryDelay do corpo quando não há Retry-After", async () => {
    const f = fakeFetch(429, { error: { status: "RESOURCE_EXHAUSTED", details: [{ retryDelay: "12s" }] } });
    const err = await createGeminiProvider({ apiKey: "k", model: "m", fetch: f }).generate(REQ).catch((e) => e);
    expect(err).toBeInstanceOf(TransientTaskError);
    expect(err.retryAfterMs).toBe(12_000);
    expect(err.message).toContain("RESOURCE_EXHAUSTED");
  });

  it("Gemini: junta vários pedaços de texto do model_output e ignora o passo thought", async () => {
    const f = fakeFetch(200, {
      status: "completed",
      steps: [
        { type: "thought", signature: "x" },
        { type: "model_output", content: [{ type: "text", text: '{"a":' }, { type: "text", text: "1}" }] },
      ],
    });
    expect(await createGeminiProvider({ apiKey: "k", model: "m", fetch: f }).generate(REQ)).toBe('{"a":1}');
  });

  it("Gemini: aceita output_text (atalho da doc) como fallback", async () => {
    const f = fakeFetch(200, { output_text: '{"a":1}' });
    expect(await createGeminiProvider({ apiKey: "k", model: "m", fetch: f }).generate(REQ)).toBe('{"a":1}');
  });

  it("Gemini: interação não concluída vira erro com o status", async () => {
    const f = fakeFetch(200, { status: "incomplete", steps: [] });
    const err = await createGeminiProvider({ apiKey: "k", model: "m", fetch: f }).generate(REQ).catch((e) => e);
    expect(err.message).toContain("incomplete");
  });

  it("Gemini: só com passo thought (sem texto) é erro", async () => {
    const f = fakeFetch(200, { status: "completed", steps: [{ type: "thought", signature: "x" }] });
    await expect(createGeminiProvider({ apiKey: "k", model: "m", fetch: f }).generate(REQ)).rejects.toThrow(/sem texto/);
  });

  it("OpenAI: recusa do modelo volta vazia (vira resposta inválida)", async () => {
    const f = fakeFetch(200, { output: [{ type: "message", content: [{ type: "refusal", refusal: "não posso" }] }] });
    expect(await createOpenAiProvider({ apiKey: "k", model: "m", fetch: f }).generate(REQ)).toBe("");
  });

  it("OpenAI: pede json_schema estrito", async () => {
    const f = fakeFetch(200, { output: [] });
    await createOpenAiProvider({ apiKey: "k", model: "m", fetch: f }).generate(REQ);
    const body = JSON.parse(String((f.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body.text.format).toMatchObject({ type: "json_schema", strict: true, name: "triagem" });
  });
});

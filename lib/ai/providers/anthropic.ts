import Anthropic from "@anthropic-ai/sdk";
import { PermanentTaskError, TransientTaskError } from "@/lib/tasks/errors";
import { PROVIDER_TIMEOUT_MS, type AiProvider, type FetchLike, type StructuredRequest } from "./types";

// Anthropic (Claude) via SDK oficial — único provedor desta camada que usa
// SDK em vez de fetch cru (os outros dois chamam a API REST direto); pedido
// explícito pra usar @anthropic-ai/sdk. O SDK aceita um `fetch` customizado
// no construtor, então ainda dá pra injetar um fake nos testes, igual aos
// outros providers.
//
// Claude não tem um "modo JSON estrito" como o Responses API da OpenAI — a
// forma confiável de obter JSON que bate com o schema é forçar o uso de uma
// "tool" cujo input_schema É o jsonSchema pedido (tool_choice: {type:"tool"}),
// e ler de volta o `input` da chamada de ferramenta (já vem como objeto).
export function createAnthropicProvider(opts: { apiKey: string; model: string; fetch?: FetchLike }): AiProvider {
  const client = new Anthropic({ apiKey: opts.apiKey, fetch: opts.fetch, timeout: PROVIDER_TIMEOUT_MS });

  return {
    name: "anthropic",
    model: opts.model,
    isMock: false,
    async generate(req: StructuredRequest) {
      let message;
      try {
        message = await client.messages.create({
          model: opts.model,
          max_tokens: 4096,
          system: req.system,
          messages: [{ role: "user", content: req.input }],
          tools: [{ name: req.schemaName, description: "Devolve o resultado estruturado.", input_schema: req.jsonSchema as Anthropic.Tool.InputSchema }],
          tool_choice: { type: "tool", name: req.schemaName },
        });
      } catch (err) {
        throw toTaskError(err);
      }

      return extractAnthropicToolInput(message, req.schemaName);
    },
  };
}

function toTaskError(err: unknown): Error {
  if (!(err instanceof Anthropic.APIError)) return err instanceof Error ? err : new Error(String(err));

  const message = `Anthropic HTTP ${err.status}${err.name ? ` (${err.name})` : ""}`;
  // 429 (limite de uso) e 529 (sobrecarregado): temporário, volta pra fila
  // sem consumir tentativa. 400/401/403/404: chave/modelo/requisição
  // inválidos — tentar de novo não resolve.
  if (err.status === 429 || err.status === 529) {
    const retryAfterHeader = err.headers?.["retry-after"];
    const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : undefined;
    return new TransientTaskError(message, { retryAfterMs: Number.isFinite(retryAfterMs) ? retryAfterMs : undefined });
  }
  if (err.status === 400 || err.status === 401 || err.status === 403 || err.status === 404) {
    return new PermanentTaskError(message);
  }
  return new Error(message);
}

// content[] → primeiro item "tool_use" com o nome esperado → seu `input`
// (já é um objeto, não string — por isso stringify aqui, pra manter a
// mesma interface "devolve texto cru" que o chamador espera dos 3 providers).
export function extractAnthropicToolInput(message: unknown, toolName: string): string {
  const content = (message as { content?: unknown })?.content;
  if (!Array.isArray(content)) throw new Error("Anthropic: resposta sem content");

  const toolUse = content.find(
    (block): block is { type: string; name?: string; input?: unknown } =>
      typeof block === "object" && block !== null && (block as { type?: string }).type === "tool_use"
  );
  if (!toolUse || toolUse.name !== toolName || toolUse.input === undefined) {
    throw new Error("Anthropic: resposta sem tool_use esperado");
  }
  return JSON.stringify(toolUse.input);
}

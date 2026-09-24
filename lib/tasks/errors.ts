// Erros que um handler pode lançar pra mudar como o processador trata a
// falha. Qualquer outro erro é "comum": consome uma tentativa e reagenda com
// espera crescente até esgotar maxAttempts.
//
// A mensagem vai pra background_tasks.last_error e aparece na tela do ADMIN
// — nunca colocar dado pessoal (nome, e-mail, texto de currículo) nela.

// Falha temporária de terceiro (ex.: HTTP 429, 503 com Retry-After): reagenda
// SEM consumir tentativa, até o limite de reagendamentos (MAX_DEFERRALS).
export class TransientTaskError extends Error {
  readonly retryAfterMs?: number;

  constructor(message: string, options?: { retryAfterMs?: number; cause?: unknown }) {
    super(message, { cause: options?.cause });
    this.name = "TransientTaskError";
    this.retryAfterMs = options?.retryAfterMs;
  }
}

// Não adianta tentar de novo (payload inválido, registro apagado etc.):
// marca como failed na hora.
export class PermanentTaskError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, { cause: options?.cause });
    this.name = "PermanentTaskError";
  }
}

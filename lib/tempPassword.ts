// 12 caracteres alfanuméricos (hex) — fácil de copiar/digitar uma vez.
// Usado sempre que um acesso é criado sem fluxo de e-mail transacional
// (createColaborador, inviteUser): a senha só é mostrada na tela, uma vez,
// pro ADMIN repassar manualmente.
export function generateTemporaryPassword(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

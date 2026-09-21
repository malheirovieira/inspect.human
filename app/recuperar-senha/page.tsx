"use client";

import { useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/layout/AuthShell";

const BULLETS = [
  "Enviamos um link seguro para o seu e-mail",
  "O link expira sozinho depois de um tempo, por segurança",
];

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);
    // Sempre mostra sucesso, mesmo se o e-mail não existir — evita revelar
    // quais e-mails estão cadastrados.
    setSent(true);
  }

  return (
    <AuthShell title="Vamos te ajudar a voltar." bullets={BULLETS}>
      {sent ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <h2 className="auth-form__heading">Verifique seu e-mail</h2>
          <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            Se houver uma conta com o e-mail informado, enviamos um link para redefinir a senha.
          </p>
          <Link href="/login" className="fin-link">
            Voltar para o login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <h2 className="auth-form__heading">Esqueceu sua senha?</h2>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
              Informe seu e-mail e enviaremos um link de redefinição.
            </p>
          </div>

          <label className="fin-field-label">
            E-mail
            <input
              className="fin-input"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <button type="submit" className="fin-btn fin-btn--primary" disabled={loading} style={{ width: "100%" }}>
            {loading ? "Enviando..." : "Enviar link"}
          </button>

          <Link href="/login" className="fin-link" style={{ textAlign: "center" }}>
            Voltar para o login
          </Link>
        </form>
      )}
    </AuthShell>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/layout/AuthShell";

const BULLETS = [
  "Recrutamento, treinamento, ponto e folha em um só lugar",
  "Kanban de candidatos pronto para usar",
  "Ponto validado pelo servidor, sem depender do celular do colaborador",
  "Trilhas de onboarding com progresso automático",
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (signInError) {
      setError("E-mail ou senha inválidos.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <AuthShell title="Gestão de pessoas simples para pequenas empresas." bullets={BULLETS}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <h2 className="auth-form__heading">Entrar</h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            Acesse o painel da sua empresa.
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

        <label className="fin-field-label">
          Senha
          <input
            className="fin-input"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {error && <div style={{ fontSize: 13, color: "var(--danger)" }}>{error}</div>}

        <button type="submit" className="fin-btn fin-btn--primary" disabled={loading} style={{ width: "100%" }}>
          {loading ? "Entrando..." : "Entrar"}
        </button>

        <Link href="/recuperar-senha" className="fin-link" style={{ textAlign: "center" }}>
          Esqueceu sua senha?
        </Link>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, textAlign: "center" }}>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Ainda não tem conta? </span>
          <Link href="/cadastro" className="fin-link">
            Criar conta
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}

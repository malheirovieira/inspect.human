"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/layout/AuthShell";

const BULLETS = [
  "Comece grátis, sem precisar de time de TI",
  "Página pública de vagas pronta em minutos",
  "Cada empresa tem seu próprio ambiente, totalmente isolado",
  "Convide sua equipe quando quiser",
];

export default function SignupPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const response = await fetch("/api/public/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyName, adminName, email, password }),
    });
    const result = await response.json();

    if (!response.ok) {
      setLoading(false);
      setError(result.error ?? "Não foi possível criar sua conta.");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (signInError) {
      router.push("/login");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <AuthShell title="Comece a organizar o RH da sua empresa hoje." bullets={BULLETS}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <h2 className="auth-form__heading">Criar conta</h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            Leva menos de um minuto.
          </p>
        </div>

        <label className="fin-field-label">
          Nome da empresa
          <input
            className="fin-input"
            required
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
        </label>

        <label className="fin-field-label">
          Seu nome
          <input className="fin-input" required value={adminName} onChange={(e) => setAdminName(e.target.value)} />
        </label>

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
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {error && <div style={{ fontSize: 13, color: "var(--danger)" }}>{error}</div>}

        <button type="submit" className="fin-btn fin-btn--primary" disabled={loading} style={{ width: "100%" }}>
          {loading ? "Criando..." : "Criar conta"}
        </button>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, textAlign: "center" }}>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Já tem conta? </span>
          <Link href="/login" className="fin-link">
            Entrar
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}

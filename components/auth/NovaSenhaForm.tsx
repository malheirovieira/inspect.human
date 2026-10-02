"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { changePassword } from "@/app/trocar-senha/actions";

// Reaproveita a mesma action de troca de senha (app/trocar-senha/actions.ts)
// — ela já faz supabase.auth.updateUser({password}) na sessão atual, que
// aqui é a sessão de recuperação criada pelo callback. Única diferença do
// fluxo de /trocar-senha: sucesso manda pro login (sessão de recuperação é
// de uso único, melhor pedir login de novo) em vez de pro dashboard.
export function NovaSenhaForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    const result = await changePassword(password);
    setLoading(false);

    if ("error" in result) {
      setError(result.error);
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push("/login"), 2000);
  }

  if (success) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <h2 className="auth-form__heading">Senha redefinida!</h2>
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          Redirecionando para o login...
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <label className="fin-field-label">
        Nova senha
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

      <label className="fin-field-label">
        Confirmar nova senha
        <input
          className="fin-input"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </label>

      {error && <div style={{ fontSize: 13, color: "var(--danger)" }}>{error}</div>}

      <button type="submit" className="fin-btn fin-btn--confirm" disabled={loading} style={{ width: "100%" }}>
        {loading ? "Salvando..." : "Redefinir senha"}
      </button>
    </form>
  );
}

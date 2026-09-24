"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { changePassword } from "@/app/trocar-senha/actions";

export function TrocarSenhaForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

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

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h2 className="auth-form__heading">Defina sua senha</h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
          Esta é a primeira vez que você acessa — troque a senha temporária antes de continuar.
        </p>
      </div>

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
        {loading ? "Salvando..." : "Trocar senha e continuar"}
      </button>
    </form>
  );
}

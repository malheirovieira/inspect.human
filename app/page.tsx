import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

// Placeholder da Fase 1. A landing page real (seção 15 da spec) entra numa
// fase futura, junto com as páginas públicas de vagas.
export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        textAlign: "center",
        padding: 24,
      }}
    >
      <Logo />
      <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0 }}>
        Gestão de pessoas simples para pequenas empresas.
      </h1>
      <p style={{ color: "var(--text-secondary)", maxWidth: 480 }}>
        Centralize recrutamento, treinamento, ponto e informações da folha em
        um único lugar.
      </p>
      <Link href="/dashboard" className="fin-btn fin-btn--primary">
        Ver dashboard (placeholder)
      </Link>
    </main>
  );
}

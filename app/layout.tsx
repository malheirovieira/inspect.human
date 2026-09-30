import type { Metadata } from "next";
import "./globals.css";

// Variante Fluent: a fonte é a Segoe UI do Windows (fonte do sistema, não
// precisa ser carregada); em Mac/iOS cai na fonte do sistema.

export const metadata: Metadata = {
  title: "Inspect Talent",
  description: "Recrutamento e gestão de talentos para pequenas empresas.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

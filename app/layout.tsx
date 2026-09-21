import type { Metadata } from "next";
import { Playfair_Display, Poppins } from "next/font/google";
import "./globals.css";

// Fonte da wordmark (logo em texto, sem ícone) — mesma família serifada do
// Inspect Finance, exposta como variável CSS para o componente Logo.
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-logo",
});

// Fonte das frases de efeito (telas de login/cadastro) — sans-serif mais
// forte e moderna, separada da fonte de texto corrido do sistema.
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-heading",
});

export const metadata: Metadata = {
  title: "Inspect Human",
  description: "Gestão de pessoas simples para pequenas empresas.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${playfair.variable} ${poppins.variable}`}>
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import { Playfair_Display, Poppins, Inter } from "next/font/google";
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

// Fonte base do sistema (texto corrido, UI) — a mesma usada no protótipo em
// Figma Make, exposta como variável e referenciada em --font-sans.
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Inspect Human",
  description: "Gestão de pessoas simples para pequenas empresas.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${playfair.variable} ${poppins.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}

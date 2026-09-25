import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";

// Fonte da wordmark (logo em texto, sem ícone) — mesma família serifada do
// Inspect Finance, exposta como variável CSS para o componente Logo.
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-logo",
});

// Fonte base do sistema (texto corrido, UI, títulos) — a mesma em todo o
// app, inclusive nas telas de login/cadastro (--font-heading/Poppins foi
// removida: era usada só ali e o padrão atual do produto é Inter em tudo).
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Inspect Talent",
  description: "Recrutamento e gestão de talentos para pequenas empresas.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${playfair.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}

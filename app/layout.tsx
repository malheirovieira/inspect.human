import type { Metadata } from "next";
import { Playfair_Display } from "next/font/google";
import "./globals.css";

// Fonte da wordmark (logo em texto, sem ícone) — mesma família serifada do
// Inspect Finance, exposta como variável CSS para o componente Logo.
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-logo",
});

export const metadata: Metadata = {
  title: "Inspect Human",
  description: "Gestão de pessoas simples para pequenas empresas.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={playfair.variable}>
      <body>{children}</body>
    </html>
  );
}

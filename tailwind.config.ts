import type { Config } from "tailwindcss";

// Paleta do design system do Inspect Human (preto + accent verde, fundo bem
// claro). Os mesmos hex também existem como CSS vars em app/globals.css
// para as classes fin-* legadas; aqui expomos os tokens como cores
// utilitárias do Tailwind para telas construídas com utility classes
// (ex.: components/layout/Sidebar.tsx).
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        green: {
          900: "#1D1D1F",
          800: "#262626",
          700: "#34C759",
          600: "#26A349",
          400: "#6FE396",
          surface: "#E3F9E9",
        },
        gray: {
          50: "#F5F5F7",
          100: "#F3F2F0",
          200: "rgba(0,0,0,0.06)",
          400: "#86868B",
          600: "#515154",
          700: "#4A4A46",
        },
        ink: "#1D1D1F",
        success: { DEFAULT: "#34C759", surface: "#E3F9E9" },
        danger: { DEFAULT: "#FF3B30", surface: "#FFE5E3" },
        // Botões: salvar/confirmar/atualizar (verde) e cancelar/excluir
        // (vermelho) — espelho de --action-confirm/--action-cancel.
        confirm: { DEFAULT: "#177F0F", hover: "#11630B" },
        cancel: { DEFAULT: "#FE0401", hover: "#D10301" },
        // Tokens semânticos genéricos (shadcn-style) mapeados para a paleta
        // do produto — usados por componentes que trabalham em utilitários
        // Tailwind puros em vez das classes fin-* legadas.
        primary: "#1D1D1F",
        accent: "#34C759",
      },
      borderRadius: {
        sm: "10px",
        md: "10px",
        lg: "18px",
        xl: "10px",
      },
      boxShadow: {
        sm: "0 1px 3px rgba(0,0,0,0.03)",
        hover: "0 8px 24px rgba(0,0,0,0.07)",
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        "fade-in": "fadeIn 550ms cubic-bezier(0.22,1,0.36,1)",
      },
      transitionDuration: {
        "800": "800ms",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.34,1.56,0.64,1)",
        "out-soft": "cubic-bezier(0.16,1,0.3,1)",
      },
    },
  },
  plugins: [],
};

export default config;

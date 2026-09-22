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
          900: "#131313",
          800: "#262626",
          700: "#15803D",
          600: "#166534",
          400: "#4ADE80",
          surface: "#DCFCE7",
        },
        gray: {
          50: "#FAFAF9",
          100: "#F3F2F0",
          200: "#E5E3DF",
          400: "#8A8A85",
          600: "#4D4D47",
          700: "#4A4A46",
        },
        ink: "#131313",
        success: { DEFAULT: "#15803D", surface: "#DCFCE7" },
        danger: { DEFAULT: "#DC2626", surface: "#FEE2E2" },
        // Tokens semânticos genéricos (shadcn-style) mapeados para a paleta
        // do produto — usados por componentes que trabalham em utilitários
        // Tailwind puros em vez das classes fin-* legadas.
        primary: "#131313",
        accent: "#15803D",
      },
      borderRadius: {
        sm: "4px",
        md: "6px",
        lg: "16px",
        xl: "8px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(5,19,42,0.06), 0 1px 1px rgba(5,19,42,0.04)",
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
    },
  },
  plugins: [],
};

export default config;

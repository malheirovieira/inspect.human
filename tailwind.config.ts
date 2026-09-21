import type { Config } from "tailwindcss";

// Paleta do design system do Inspect Human (adaptada do Inspect Finance,
// trocando o azul original pela paleta verde do produto: #253D2C/#2E6F40).
// Os valores hexadecimais também existem como CSS vars em app/globals.css
// para as classes fin-* legadas; aqui expomos os mesmos tokens como cores
// utilitárias do Tailwind para telas novas construídas com utility classes.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        green: {
          900: "#253D2C",
          800: "#2C4E36",
          700: "#2E6F40",
          600: "#3C9054",
          400: "#8DCE9F",
          surface: "#EEF7F0",
        },
        gray: {
          50: "#F5F5F2",
          100: "#ECECE8",
          200: "#E2E1DC",
          400: "#75746D",
          700: "#4D4C46",
        },
        ink: "#1C1B17",
        success: { DEFAULT: "#1E7A4C", surface: "#E4F3EA" },
        danger: { DEFAULT: "#A23B2E", surface: "#F6E7E3" },
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "20px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(5,19,42,0.06), 0 1px 1px rgba(5,19,42,0.04)",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;

import type { Config } from "tailwindcss";

// Visual Fluent 2 (Microsoft) — neutros e status de @fluentui/tokens, com a
// paleta de marca "Nuvem limpa azul" do Inspect Talent. Mesmos valores de
// app/globals.css. As escalas padrão do
// Tailwind (gray-*, green-*, red-*) são redirecionadas pra esses tons.
const label = "#242424";
const secondaryLabel = "#424242";
const tertiaryLabel = "#616161";
const background = "#F7F9FB";
// Suavizado a pedido do usuário (2026-09-30) — mesmo valor de
// app/globals.css --separator: preto translúcido em vez de cinza sólido,
// pra todo contorno do sistema (inclusive gray-200/300 via Tailwind aqui
// embaixo) ficar mais leve.
const separator = "rgba(0, 0, 0, 0.08)";
const accent = "#386FA4";
const accentHover = "#2F5F8F";
const accentDeep = "#133C55";
const accentSky = "#59A5D8";
const accentSurface = "#EAF4FF";
const red = "#C50F1F";
const redText = "#B10E1C";
const redSurface = "#FDF3F4";
const green = "#107C10";
const greenText = "#0E700E";
const greenSurface = "#F1FAF1";
const yellow = "#F7630C";
const yellowSurface = "#FFF9F5";
const secondaryLabel2 = "#707070";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    // Rampa tipográfica Fluent 2 (substitui a do Tailwind).
    fontSize: {
      xs: ["12px", { lineHeight: "16px" }],  // Caption 1
      sm: ["14px", { lineHeight: "20px" }],  // Body 1
      base: ["14px", { lineHeight: "20px" }],
      lg: ["16px", { lineHeight: "22px" }],  // Subtitle 2
      xl: ["20px", { lineHeight: "28px" }],  // Subtitle 1
      "2xl": ["20px", { lineHeight: "28px" }],
      "3xl": ["28px", { lineHeight: "36px" }], // Title 2
      "4xl": ["28px", { lineHeight: "36px" }],
    },
    extend: {
      colors: {
        label,
        "secondary-label": secondaryLabel,
        "tertiary-label": tertiaryLabel,
        background,
        separator,
        ink: label,
        primary: label,
        accent: { DEFAULT: accent, hover: accentHover, deep: accentDeep, sky: accentSky, surface: accentSurface },
        success: { DEFAULT: greenText, surface: greenSurface },
        danger: { DEFAULT: redText, surface: redSurface },
        attention: { DEFAULT: yellow, surface: yellowSurface },
        confirm: { DEFAULT: green, hover: green },
        cancel: { DEFAULT: red, hover: red },
        gray: {
          50: background, 100: background, 200: separator, 300: separator,
          400: secondaryLabel2, 500: tertiaryLabel, 600: tertiaryLabel,
          700: secondaryLabel, 800: label, 900: label,
        },
        green: {
          50: greenSurface, 200: greenSurface, surface: greenSurface,
          400: green, 600: green, 700: green,
          // green-800/900 eram, historicamente, o preto da marca.
          800: label, 900: label,
        },
        red: { 50: redSurface, 100: redSurface, 200: redSurface, 500: red, 600: red, 700: red },
      },
      borderRadius: {
        sm: "2px",
        md: "4px",
        lg: "8px",
        xl: "8px",
      },
      boxShadow: {
        sm: "0 0 2px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.14)",
        DEFAULT: "0 0 2px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.14)",
        md: "0 0 2px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.14)",
        lg: "0 0 2px rgba(0,0,0,0.12), 0 8px 16px rgba(0,0,0,0.14)",
        hover: "0 0 2px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.14)",
        focus: "inset 0 0 0 1px #fff, 0 0 0 2px #000",
      },
      fontFamily: {
        sans: [
          "Segoe UI",
          "Segoe UI Web (West European)",
          "-apple-system",
          "BlinkMacSystemFont",
          "Roboto",
          "Helvetica Neue",
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

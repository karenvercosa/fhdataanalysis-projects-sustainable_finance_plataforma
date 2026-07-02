/** @type {import('tailwindcss').Config} */
// =====================================================================
//  DESIGN TOKENS — Sustainable Finance 2026
//  Fonte: Figma "Design System - Sustainable Finance" (node 8-2).
//  - PRIMARY  = verde da marca (usado em todos os componentes reais).
//  - SECONDARY = âmbar (paleta nomeada "primária" nos tokens; aqui vira accent).
//  - NEUTRAL / FEEDBACK = exatamente como documentado no Figma.
//  Grid de 8pt: a escala de spacing/radius é múltipla de 8 (+ 2/4/12).
// =====================================================================
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#E9F7EF",
          100: "#C9EBD8",
          200: "#A7DEC0",
          300: "#7FCFA3",
          400: "#46B27D",
          500: "#1E8E5A", // brand
          600: "#15784B",
          700: "#0F5F3C",
          800: "#0B492E",
          900: "#073021",
          950: "#04201",
          ink: "#0A2A1C" // botão sólido escuro do DS
        },
        secondary: {
          50: "#FEF4E4",
          400: "#FCBD52",
          500: "#FBAB38", // accent âmbar
          600: "#DF9123",
          700: "#73501A",
          800: "#4A3414"
        },
        neutral: {
          0: "#FFFFFF",
          50: "#F5F7F8",
          100: "#EDF0F2",
          200: "#E1E5E8",
          400: "#9AA5B1",
          600: "#616E7C",
          900: "#1F2933",
          1000: "#111820"
        },
        success: { 50: "#E8F5EE", 500: "#2E8B57" },
        error: { 50: "#FBEAEA", 500: "#D93838" },
        warning: { 50: "#FCF4E3", 500: "#E6A100" },
        info: { 50: "#E9F1FD", 500: "#2F80ED" }
      },
      fontFamily: {
        heading: ['"Miriam Libre"', "system-ui", "sans-serif"],
        body: ['"Lexend"', "system-ui", "sans-serif"]
      },
      fontSize: {
        // Escala documentada (Headings = Miriam Libre / Body = Lexend)
        "h1": ["32px", { lineHeight: "40px", fontWeight: "700" }],
        "h2": ["24px", { lineHeight: "32px", fontWeight: "700" }],
        "h3": ["20px", { lineHeight: "28px", fontWeight: "600" }],
        "h4": ["16px", { lineHeight: "24px", fontWeight: "600" }],
        "h5": ["14px", { lineHeight: "20px", fontWeight: "500" }],
        "body-lg": ["16px", { lineHeight: "24px" }],
        "body": ["14px", { lineHeight: "20px" }],
        "body-sm": ["12px", { lineHeight: "16px" }],
        "button": ["14px", { lineHeight: "20px", fontWeight: "600" }]
      },
      borderRadius: {
        // Raios documentados no Figma
        sm: "4px",
        DEFAULT: "8px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "24px"
      },
      boxShadow: {
        card: "0 1px 2px rgba(17,24,32,.06), 0 4px 16px rgba(17,24,32,.06)",
        pop: "0 8px 32px rgba(17,24,32,.12)"
      }
    }
  },
  plugins: []
};

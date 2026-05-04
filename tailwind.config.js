/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      keyframes: {
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "fade-in-up": "fadeInUp 0.25s ease-out forwards",
        "fade-in": "fadeIn 0.2s ease-out forwards",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          bg: "var(--brand-bg)",
          card: "var(--brand-card)",
          border: "var(--brand-border)",
          accent: "rgb(var(--brand-accent) / <alpha-value>)",
          "accent-hover": "var(--brand-accent-hover)",
          primary: "rgb(var(--brand-primary) / <alpha-value>)",
          success: "rgb(var(--brand-success) / <alpha-value>)",
          warning: "rgb(var(--brand-warning) / <alpha-value>)",
          danger: "rgb(var(--brand-danger) / <alpha-value>)",
          muted: "var(--brand-muted)",
          text: "var(--brand-text)",
        },
      },
    },
  },
  plugins: [],
};

import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--color-bg)",
        surface: "var(--color-surface)",
        "surface-raised": "var(--color-surface-raised)",
        "surface-overlay": "var(--color-surface-overlay)",
        accent: "var(--color-accent)",
        "accent-soft": "var(--color-accent-soft)",
        warning: "var(--color-warning)",
        "warning-soft": "var(--color-warning-soft)",
        danger: "var(--color-danger)",
        "danger-soft": "var(--color-danger-soft)",
        info: "var(--color-info)",
        "info-soft": "var(--color-info-soft)",
        knowledge: "var(--color-knowledge)",
        "knowledge-soft": "var(--color-knowledge-soft)",
      },
      borderRadius: {
        card: "8px",
        button: "6px",
      },
      boxShadow: {
        panel: "0 16px 42px rgba(0, 0, 0, 0.28)",
        card: "0 6px 18px rgba(0, 0, 0, 0.22)",
      },
    },
  },
  plugins: [],
};

export default config;

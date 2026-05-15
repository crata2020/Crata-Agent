import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#F6F7F4",
        surface: "#FFFFFF",
        surfaceAlt: "#EEF2EE",
        border: "#D8DED8",
        primary: "#1F6B57",
        approval: "#C9852B",
        analysis: "#34699A",
        danger: "#B83A3A",
        success: "#2F7D4E",
      },
      borderRadius: {
        card: "8px",
        button: "6px",
      },
      boxShadow: {
        panel: "0 8px 24px rgba(31, 39, 35, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;

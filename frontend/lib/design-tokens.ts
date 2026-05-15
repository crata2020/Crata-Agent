export const statusColors = {
  idle: "#5F6B64",
  working: "#1F6B57",
  reviewing: "#34699A",
  waiting_for_approval: "#C9852B",
  approved: "#2F7D4E",
  rejected: "#B83A3A",
  error: "#B83A3A",
  disabled: "#9AA39D",
  planned: "#D8DED8",
} as const;

export const designTokens = {
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
  radius: {
    card: "8px",
    button: "6px",
  },
  shadow: {
    panel: "0 8px 24px rgba(31, 39, 35, 0.08)",
  },
} as const;

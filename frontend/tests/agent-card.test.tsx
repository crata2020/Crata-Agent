import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AgentCard } from "@/components/agent-card";
import type { Agent } from "@/lib/types";

const conceptGuardian: Agent = {
  id: "agent-concept-guardian",
  name: "concept_guardian",
  display_name: "개념수호자",
  role: "핵심 개념과 용어의 일관성을 검토합니다.",
  description: "CRATA 문서의 개념 언어를 보호합니다.",
  status: "idle",
  default_model_provider: "openai",
  default_model_name: "gpt-4.1-mini",
  prompt: "",
  enabled: true,
  color: "#34699A",
};

describe("AgentCard", () => {
  it("renders a concept guardian card with display name and role", () => {
    render(<AgentCard agent={conceptGuardian} />);

    expect(screen.getByText("개념수호자")).toBeInTheDocument();
    expect(screen.getByText("핵심 개념과 용어의 일관성을 검토합니다.")).toBeInTheDocument();
  });
});

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AgentCard } from "@/components/agent-card";
import type { Agent } from "@/lib/types";

const conceptGuardian: Agent = {
  id: "concept_guardian",
  name: "Concept Guardian",
  display_name: "개념수호자",
  role: "공식 지식과 개념 일관성 검수",
  description: "검사 개념, 유형 정의, 공식 지식 충돌 여부를 검토합니다.",
  status: "idle",
  default_model_provider: "openai",
  default_model_name: "gpt-4.1-mini",
  prompt: "",
  enabled: true,
  color: "#6A5EA8",
};

describe("AgentCard", () => {
  it("renders a concept guardian card with display name and role", () => {
    render(<AgentCard agent={conceptGuardian} />);

    expect(screen.getByText("개념수호자")).toBeInTheDocument();
    expect(screen.getByText("공식 지식과 개념 일관성 검수")).toBeInTheDocument();
  });
});

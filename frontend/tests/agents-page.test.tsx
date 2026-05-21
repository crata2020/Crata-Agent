import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AgentsPage from "@/app/agents/page";
import { agentOperatingGuides } from "@/lib/agent-operating-guides";
import { agentSeeds } from "@/lib/agent-seeds";

describe("AgentsPage", () => {
  it("renders all 10 shared agent seeds", () => {
    expect(agentSeeds).toHaveLength(10);

    render(<AgentsPage />);

    for (const agent of agentSeeds) {
      expect(screen.getAllByText(agent.display_name).length).toBeGreaterThan(0);
    }
  });

  it("shows the selected agent operating guide without flooding the page", () => {
    expect(agentOperatingGuides).toHaveLength(agentSeeds.length);

    render(<AgentsPage />);

    expect(screen.getByText("전문 작업 절차")).toBeInTheDocument();
    expect(screen.getAllByText("CRATA CEO 절차").length).toBeGreaterThan(0);
    expect(screen.queryByText("대상, 문제, 목적, 성과, 예산, 일정, 검사 활용 방식을 먼저 질문합니다.")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "사업설계자 상세 보기" }));

    expect(screen.getAllByText("사업설계자 절차").length).toBeGreaterThan(0);
    expect(screen.getByText("대상, 문제, 목적, 성과, 예산, 일정, 검사 활용 방식을 먼저 질문합니다.")).toBeInTheDocument();
  });
});

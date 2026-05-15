import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
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

  it("shows each agent operating guide summary", () => {
    expect(agentOperatingGuides).toHaveLength(agentSeeds.length);

    render(<AgentsPage />);

    expect(screen.getByText("전문 작업 절차")).toBeInTheDocument();
    expect(screen.getByText("CRATA CEO 절차")).toBeInTheDocument();
    expect(screen.getByText("사업설계자 절차")).toBeInTheDocument();
    expect(screen.getByText("대상, 문제, 목적, 성과, 예산, 일정, 검사 활용 방식을 먼저 질문합니다.")).toBeInTheDocument();
    expect(screen.getByText("콘텐츠전략가 절차")).toBeInTheDocument();
    expect(screen.getByText("채널, 타깃, 메시지, 전환 목표, 금지 표현을 먼저 확인합니다.")).toBeInTheDocument();
    expect(screen.getByText("운영비서 절차")).toBeInTheDocument();
  });
});

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DashboardContent } from "@/app/page";
import { agentSeeds } from "@/lib/agent-seeds";
import type { AgentActivity, DashboardSummary } from "@/lib/types";
import sharedAgentSeeds from "../../shared/agent-seeds.json";

describe("dashboard static agents", () => {
  const summary: DashboardSummary = {
    agent_count: 10,
    active_agent_count: 7,
    candidate_task_count: 4,
    running_task_count: 0,
    pending_approval_count: 2,
    artifact_count: 1,
  };
  const activity: AgentActivity[] = sharedAgentSeeds.map((agent) => ({
    id: agent.id,
    display_name: agent.display_name,
    role: agent.role,
    color: agent.color,
    enabled: agent.enabled,
    status: agent.status,
    activity_status: agent.id === "report_editor" ? "waiting_approval" : agent.enabled ? "idle" : "planned",
    current_focus:
      agent.id === "report_editor"
        ? "결과지 문구 수정 후보 승인 요청"
        : agent.enabled
          ? "새 요청 대기"
          : "2차 확장 준비",
    current_task_title: agent.id === "report_editor" ? "결과지 문구 수정 후보 승인 요청" : null,
    current_task_type: agent.id === "report_editor" ? "report_phrase_revision" : null,
    workload_count: agent.id === "report_editor" ? 2 : 0,
    pending_approval_count: agent.id === "report_editor" ? 1 : 0,
    candidate_count: 0,
  }));

  it("uses the shared agent seed source", () => {
    expect(agentSeeds).toEqual(sharedAgentSeeds);
  });

  it("renders agent display names and roles from the shared seeds", () => {
    render(<DashboardContent summary={summary} agentActivity={activity} />);

    for (const agent of sharedAgentSeeds) {
      expect(screen.getAllByText(agent.display_name).length).toBeGreaterThan(0);
      expect(screen.getAllByText(agent.role).length).toBeGreaterThan(0);
    }
  });

  it("renders live dashboard summary counts", () => {
    render(<DashboardContent summary={summary} agentActivity={activity} />);

    expect(screen.getByText("작업 후보")).toBeInTheDocument();
    expect(screen.getAllByText("승인대기").length).toBeGreaterThan(0);
    expect(screen.getAllByText("4").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2").length).toBeGreaterThan(0);
  });

  it("renders an at-a-glance office operations board", () => {
    render(<DashboardContent summary={summary} agentActivity={activity} />);

    expect(screen.getByText("실시간 운영실")).toBeInTheDocument();
    expect(screen.getByText("작업 흐름 레일")).toBeInTheDocument();
    expect(screen.getByText("활동 검사기")).toBeInTheDocument();
    expect(screen.getByText("최근 신호")).toBeInTheDocument();
    expect(screen.getAllByText("후보 정리").length).toBeGreaterThan(0);
    expect(screen.getAllByText("승인 검토").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "요청 콘솔 열기" })[0]).toHaveAttribute("href", "/request-intake");
    expect(screen.getAllByRole("link", { name: "승인함 확인" })[0]).toHaveAttribute("href", "/approvals");
  });

  it("renders a visual agent activity map with current work per agent", () => {
    render(<DashboardContent summary={summary} agentActivity={activity} />);

    expect(screen.getByText("에이전트 활동 맵")).toBeInTheDocument();
    expect(screen.getByText("각 직원이 지금 어떤 작업을 맡고 있는지 카드와 흐름으로 봅니다.")).toBeInTheDocument();
    expect(screen.getByText("결과지 문구 수정 후보 승인 요청")).toBeInTheDocument();
    expect(screen.getAllByText("승인 대기").length).toBeGreaterThan(0);
    expect(screen.getAllByText("현재 포커스").length).toBeGreaterThan(0);
  });
});

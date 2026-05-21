import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AgentFlowCanvas } from "@/components/agent-flow-canvas";
import type { AgentActivity, DashboardSummary } from "@/lib/types";

const summary: DashboardSummary = {
  agent_count: 3,
  active_agent_count: 3,
  candidate_task_count: 4,
  running_task_count: 1,
  pending_approval_count: 2,
  artifact_count: 6,
};

const agents: AgentActivity[] = [
  {
    id: "crata_ceo",
    display_name: "CRATA CEO",
    role: "전체 라우팅과 작업 조율",
    color: "#1F6B57",
    enabled: true,
    status: "idle",
    activity_status: "working",
    current_focus: "요청을 분류하고 워크플로우를 배정합니다.",
    current_task_title: null,
    current_task_type: null,
    workload_count: 2,
    pending_approval_count: 1,
    candidate_count: 1,
    work_items: [],
  },
  {
    id: "concept_guardian",
    display_name: "개념수호자",
    role: "공식 지식과 개념 일관성 검수",
    color: "#6A5EA8",
    enabled: true,
    status: "idle",
    activity_status: "queued",
    current_focus: "집단행동검사 개념지도를 검수합니다.",
    current_task_title: null,
    current_task_type: null,
    workload_count: 1,
    pending_approval_count: 0,
    candidate_count: 2,
    work_items: [],
  },
  {
    id: "report_editor",
    display_name: "결과지 에디터",
    role: "검사 결과지 문구 작성과 수정",
    color: "#34699A",
    enabled: true,
    status: "idle",
    activity_status: "idle",
    current_focus: "결과지 문구를 기다리는 중입니다.",
    current_task_title: null,
    current_task_type: null,
    workload_count: 0,
    pending_approval_count: 0,
    candidate_count: 0,
    work_items: [],
  },
];

describe("AgentFlowCanvas", () => {
  it("renders the agent office visualizer rooms and system summary", () => {
    render(<AgentFlowCanvas agents={agents} summary={summary} workflowRuns={[]} />);

    expect(screen.getByText("Agent Office")).toBeInTheDocument();
    expect(screen.getByText("검사·지식 연구실")).toBeInTheDocument();
    expect(screen.getByText("결과지 제작실")).toBeInTheDocument();
    expect(screen.getByText("운영 현황")).toBeInTheDocument();
    expect(screen.getByText("산출물")).toBeInTheDocument();
  });

  it("updates the operator panel when an agent is selected", () => {
    render(<AgentFlowCanvas agents={agents} summary={summary} workflowRuns={[]} />);

    fireEvent.click(screen.getByRole("button", { name: "개념수호자 프로필 열기" }));

    expect(screen.getAllByText("개념수호자").length).toBeGreaterThan(0);
    expect(screen.getAllByText("집단행동검사 개념지도를 검수합니다.").length).toBeGreaterThan(0);
  });
});

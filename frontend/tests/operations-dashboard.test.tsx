import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OperationsDashboard } from "@/components/operations-dashboard";
import type { AgentActivity, DashboardSummary, WorkflowRunActivity } from "@/lib/types";

const summary: DashboardSummary = {
  agent_count: 10,
  active_agent_count: 8,
  candidate_task_count: 12,
  running_task_count: 3,
  pending_approval_count: 2,
  artifact_count: 7,
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
    current_focus: "요청을 분류합니다.",
    current_task_title: null,
    current_task_type: null,
    workload_count: 2,
    pending_approval_count: 1,
    candidate_count: 1,
    work_items: [
      {
        id: "candidate-1",
        source_type: "candidate",
        title: "집단검사 개념지도 정리",
        summary: "의사결정방식과 자기효능감 기준 정리",
        task_type: "knowledge",
        status: "working",
        href: "/request-intake",
      },
    ],
  },
  {
    id: "concept_guardian",
    display_name: "개념수호자",
    role: "공식 지식과 개념 일관성 검수",
    color: "#6A5EA8",
    enabled: true,
    status: "idle",
    activity_status: "waiting_approval",
    current_focus: "공식 표현을 검수합니다.",
    current_task_title: null,
    current_task_type: null,
    workload_count: 1,
    pending_approval_count: 1,
    candidate_count: 0,
    work_items: [],
  },
];

const workflowRuns: WorkflowRunActivity[] = [
  {
    id: "run-1",
    workflow_type: "knowledge_update",
    task_id: "task-1",
    task_title: "집단검사 지식 정리",
    task_type: "knowledge",
    status: "running",
    current_step: "개념지도 후보 생성",
    started_at: "2026-05-21T09:00:00.000Z",
    completed_at: null,
    steps: [],
  },
];

describe("OperationsDashboard", () => {
  it("renders Paperclip-style operational dashboard sections", () => {
    render(<OperationsDashboard agents={agents} summary={summary} workflowRuns={workflowRuns} />);

    expect(screen.getByRole("heading", { name: "대시보드" })).toBeInTheDocument();
    expect(screen.getByText("총 에이전트")).toBeInTheDocument();
    expect(screen.getByText("작업 후보")).toBeInTheDocument();
    expect(screen.getByText("승인 대기")).toBeInTheDocument();
    expect(screen.getByText("오늘 요약")).toBeInTheDocument();
    expect(screen.getByText("최근 활동")).toBeInTheDocument();
    expect(screen.getByText("프로젝트 업데이트")).toBeInTheDocument();
    expect(screen.getByText("에이전트 상태")).toBeInTheDocument();
    expect(screen.getByText("집단검사 지식 정리")).toBeInTheDocument();
    expect(screen.getByText("집단검사 개념지도 정리")).toBeInTheDocument();
  });
});

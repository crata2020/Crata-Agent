import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AgentOrgChart } from "@/components/agent-org-chart";
import type { AgentActivity } from "@/lib/types";

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
    pending_approval_count: 0,
    candidate_count: 0,
    work_items: [],
  },
  {
    id: "concept_guardian",
    display_name: "개념수호자",
    role: "공식 지식과 개념 일관성 검수",
    color: "#6A5EA8",
    enabled: true,
    status: "idle",
    activity_status: "idle",
    current_focus: "공식 표현을 검수합니다.",
    current_task_title: null,
    current_task_type: null,
    workload_count: 1,
    pending_approval_count: 0,
    candidate_count: 0,
    work_items: [],
  },
];

describe("AgentOrgChart", () => {
  it("renders the Paperclip-like org chart with zoom controls", () => {
    render(<AgentOrgChart agents={agents} />);

    expect(screen.getByRole("heading", { name: "ORG CHART" })).toBeInTheDocument();
    expect(screen.getByText("CRATA CEO")).toBeInTheDocument();
    expect(screen.getByText("개념수호자")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "조직도 확대" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "조직도 축소" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "조직도 확대" }));

    expect(screen.getByText("ORG CHART")).toBeInTheDocument();
  });
});

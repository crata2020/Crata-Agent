import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ActivityContent } from "@/app/activity/page";
import type { WorkflowRunActivity } from "@/lib/types";

describe("ActivityContent", () => {
  it("renders workflow runs as an agent execution timeline", () => {
    const runs: WorkflowRunActivity[] = [
      {
        id: "run-1",
        workflow_type: "agent_operation",
        task_id: "task-1",
        task_title: "결과지 문구 수정 후보 승인 요청",
        task_type: "report_phrase_revision",
        status: "pending_approval",
        current_step: "approval_pending",
        started_at: "2026-05-16T03:10:00Z",
        completed_at: null,
        steps: [
          {
            id: "step-1",
            step_name: "ceo_routing",
            agent_id: "crata_ceo",
            input_summary: "작업 흐름을 배정합니다.",
            output_summary: "completed",
            status: "completed",
            started_at: "2026-05-16T03:10:00Z",
            completed_at: "2026-05-16T03:10:03Z",
          },
          {
            id: "step-2",
            step_name: "specialist_draft",
            agent_id: "report_editor",
            input_summary: "문구 수정 후보를 작성합니다.",
            output_summary: "검토 가능한 초안을 생성했습니다.",
            status: "completed",
            started_at: "2026-05-16T03:10:03Z",
            completed_at: "2026-05-16T03:10:08Z",
          },
        ],
      },
    ];

    render(<ActivityContent workflowRuns={runs} dataUnavailable={false} />);

    expect(screen.getByRole("heading", { name: "활동 로그", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("결과지 문구 수정 후보 승인 요청")).toBeInTheDocument();
    expect(screen.getByText("CEO 라우팅")).toBeInTheDocument();
    expect(screen.getByText("전문가 초안")).toBeInTheDocument();
    expect(screen.getByText("CRATA CEO")).toBeInTheDocument();
    expect(screen.getByText("결과지 에디터")).toBeInTheDocument();
    expect(screen.getByText("작업 흐름을 배정합니다.")).toBeInTheDocument();
    expect(screen.queryByText("completed")).not.toBeInTheDocument();
  });
});

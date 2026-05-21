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
        graph_name: "agent_operation_graph",
        node_trace: [
          { name: "ceo_routing", status: "completed", summary: "CEO가 라우팅했습니다." },
          { name: "context_retrieval", status: "completed", summary: "근거를 연결했습니다." },
        ],
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
    expect(screen.getAllByText("CEO 라우팅").length).toBeGreaterThan(0);
    expect(screen.getByText("전문가 초안")).toBeInTheDocument();
    expect(screen.getByText("단계 흐름")).toBeInTheDocument();
    expect(screen.getByText("CEO")).toBeInTheDocument();
    expect(screen.getByText("초안")).toBeInTheDocument();
    expect(screen.getByText("agent_operation_graph")).toBeInTheDocument();
    expect(screen.getByText("내부 처리 2/2 완료 · 마지막 단계 컨텍스트 수집")).toBeInTheDocument();
    expect(screen.queryByText("그래프 노드: ceo_routing -> context_retrieval")).not.toBeInTheDocument();
    expect(screen.getByText("CRATA CEO")).toBeInTheDocument();
    expect(screen.getByText("결과지 에디터")).toBeInTheDocument();
    expect(screen.getByText("작업 흐름을 배정합니다.")).toBeInTheDocument();
    expect(screen.queryByText("completed")).not.toBeInTheDocument();
  });

  it("filters workflow activity to the task opened from approval inbox", () => {
    const runs: WorkflowRunActivity[] = [
      {
        id: "run-1",
        workflow_type: "agent_operation",
        task_id: "task-1",
        task_title: "결과지 문구 실행",
        task_type: "report_phrase_revision",
        status: "pending_approval",
        current_step: "approval_pending",
        started_at: "2026-05-16T03:10:00Z",
        completed_at: null,
        steps: [],
      },
      {
        id: "run-2",
        workflow_type: "agent_operation",
        task_id: "task-2",
        task_title: "상담 사례 학습 실행",
        task_type: "counseling_case_learning",
        status: "pending_approval",
        current_step: "approval_pending",
        started_at: "2026-05-16T03:12:00Z",
        completed_at: null,
        steps: [],
      },
    ];

    render(<ActivityContent workflowRuns={runs} dataUnavailable={false} highlightedTaskId="task-2" />);

    expect(screen.getByText("선택한 실행 흐름을 표시합니다.")).toBeInTheDocument();
    expect(screen.getByText("상담 사례 학습 실행")).toBeInTheDocument();
    expect(screen.queryByText("결과지 문구 실행")).not.toBeInTheDocument();
    expect(screen.getByText("실행 기록")).toBeInTheDocument();
    expect(screen.getByText("실행 1")).toBeInTheDocument();
  });

  it("filters workflow activity by agent and links back to the map", () => {
    const runs: WorkflowRunActivity[] = [
      {
        id: "run-1",
        workflow_type: "agent_operation",
        task_id: "task-1",
        task_title: "결과지 문구 실행",
        task_type: "report_phrase_revision",
        status: "pending_approval",
        current_step: "approval_pending",
        started_at: "2026-05-16T03:10:00Z",
        completed_at: null,
        steps: [
          {
            id: "step-1",
            step_name: "specialist_draft",
            agent_id: "report_editor",
            input_summary: "문구를 수정합니다.",
            output_summary: "초안 작성 완료",
            status: "completed",
            started_at: "2026-05-16T03:10:00Z",
            completed_at: "2026-05-16T03:11:00Z",
          },
        ],
      },
      {
        id: "run-2",
        workflow_type: "agent_operation",
        task_id: "task-2",
        task_title: "상담 사례 학습 실행",
        task_type: "counseling_case_learning",
        status: "pending_approval",
        current_step: "approval_pending",
        started_at: "2026-05-16T03:12:00Z",
        completed_at: null,
        steps: [
          {
            id: "step-2",
            step_name: "specialist_draft",
            agent_id: "case_learner",
            input_summary: "사례를 분리합니다.",
            output_summary: "사례 후보 작성",
            status: "completed",
            started_at: "2026-05-16T03:12:00Z",
            completed_at: "2026-05-16T03:13:00Z",
          },
        ],
      },
    ];

    render(<ActivityContent workflowRuns={runs} dataUnavailable={false} highlightedAgentId="report_editor" />);

    expect(screen.getByText("선택한 실행 흐름을 표시합니다.")).toBeInTheDocument();
    expect(screen.getByText("결과지 문구 실행")).toBeInTheDocument();
    expect(screen.queryByText("상담 사례 학습 실행")).not.toBeInTheDocument();
    expect(screen.getByText("에이전트 결과지 에디터")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "운영 맵에서 에이전트 보기" })).toHaveAttribute(
      "href",
      "/map?taskId=task-1&agentId=report_editor",
    );
    expect(screen.getAllByRole("link", { name: "맵" })[0]).toHaveAttribute(
      "href",
      "/map?taskId=task-1&agentId=report_editor",
    );
  });
});

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DashboardContent } from "@/app/map/page";
import type { DashboardSummary, RequestMapItem } from "@/lib/types";

describe("request flow map", () => {
  const summary: DashboardSummary = {
    agent_count: 10,
    active_agent_count: 9,
    candidate_task_count: 4,
    running_task_count: 1,
    pending_approval_count: 2,
    artifact_count: 1,
  };

  const requestMap: RequestMapItem[] = [
    {
      id: "intake-1",
      title: "결과지 문구 요청",
      input_type: "meeting_notes",
      raw_preview: "결과지 문구를 수정하고 사업 프로그램 기획 후보도 같이 분리하자.",
      created_at: "2026-05-16T03:10:00Z",
      decomposition_trace: [
        { name: "detect_input", status: "completed", summary: "회의록으로 판단했습니다." },
        { name: "build_candidates", status: "completed", summary: "2개 후보를 만들었습니다." },
      ],
      candidates: [
        {
          id: "candidate-1",
          task_id: "task-1",
          workflow_run_id: "run-1",
          approval_id: "approval-1",
          task_type: "report_phrase_revision",
          title: "결과지 문구 수정 후보",
          summary: "회의록에서 나온 결과지 문구 수정 요청을 승인 후보로 정리한다.",
          status: "pending_approval",
          current_step: "approval_pending",
          current_step_index: 5,
          total_steps: 5,
          href: "/approvals?approvalId=approval-1",
          activity_href: "/activity?taskId=task-1",
          agents: [
            { id: "report_editor", display_name: "결과지 에디터", color: "#38BDF8", status: "active" },
            { id: "quality_inspector", display_name: "품질검수관", color: "#F2B84B", status: "active" },
          ],
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
              step_name: "quality_review",
              agent_id: "quality_inspector",
              input_summary: "검수합니다.",
              output_summary: "completed",
              status: "completed",
              started_at: "2026-05-16T03:10:03Z",
              completed_at: "2026-05-16T03:10:08Z",
            },
          ],
        },
      ],
    },
    {
      id: "intake-2",
      title: "상담 전사록 요청",
      input_type: "transcript",
      raw_preview: "상담 전사록에서 사례 학습 후보와 관계 패턴 후보를 분리한다.",
      created_at: "2026-05-16T03:12:00Z",
      decomposition_trace: [],
      candidates: [
        {
          id: "candidate-2",
          task_id: null,
          workflow_run_id: null,
          approval_id: null,
          task_type: "counseling_case_learning",
          title: "상담 사례 학습 후보",
          summary: "익명화된 사례 학습 후보를 만든다.",
          status: "draft",
          current_step: null,
          current_step_index: 1,
          total_steps: 5,
          href: "/?candidateId=candidate-2",
          activity_href: null,
          agents: [{ id: "case_learner", display_name: "사례학습가", color: "#F2B84B", status: "active" }],
          steps: [],
        },
      ],
    },
  ];

  it("renders each chat request in the selector and expands the selected flow card", () => {
    render(<DashboardContent summary={summary} requestMap={requestMap} />);

    expect(screen.getByRole("heading", { name: "운영 맵" })).toBeInTheDocument();
    expect(screen.getByText("요청 목록")).toBeInTheDocument();
    expect(screen.getByText("요청별 진행")).toBeInTheDocument();
    expect(screen.getAllByTestId("request-flow-card")).toHaveLength(1);
    expect(screen.getAllByText("채팅 1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("채팅 2").length).toBeGreaterThan(0);
    expect(screen.getAllByText("회의록").length).toBeGreaterThan(0);
    expect(screen.getAllByText("상담 전사록").length).toBeGreaterThan(0);
    expect(screen.getAllByText("결과지 문구 요청").length).toBeGreaterThan(0);
    expect(screen.getAllByText("상담 전사록 요청").length).toBeGreaterThan(0);
  });

  it("shows classified work, assigned agents, and approval/activity links inside the request card", () => {
    render(<DashboardContent summary={summary} requestMap={requestMap} />);

    expect(screen.getAllByText("작업 분류").length).toBeGreaterThan(0);
    expect(screen.getAllByText("에이전트 실행").length).toBeGreaterThan(0);
    expect(screen.getAllByText("검수").length).toBeGreaterThan(0);
    expect(screen.getAllByText("승인").length).toBeGreaterThan(0);
    expect(screen.getAllByText("결과지 에디터 · 품질검수관").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "실행 로그" })).toHaveAttribute(
      "href",
      "/activity?taskId=task-1",
    );
  });

  it("selects a request and updates the inspector summary", () => {
    render(<DashboardContent summary={summary} requestMap={requestMap} selectedRequestId="intake-2" />);

    expect(screen.getAllByText("상담 전사록 요청").length).toBeGreaterThan(0);
    expect(screen.getAllByText("상담 전사록에서 사례 학습 후보와 관계 패턴 후보를 분리한다.").length).toBeGreaterThan(0);
    expect(screen.getAllByText("사례학습가").length).toBeGreaterThan(0);
  });

  it("selects the matching request when opened from a candidate link", () => {
    render(<DashboardContent summary={summary} requestMap={requestMap} focusCandidateId="candidate-2" />);

    expect(screen.getAllByText("상담 전사록 요청").length).toBeGreaterThan(0);
    expect(screen.getAllByText("상담 전사록에서 사례 학습 후보와 관계 패턴 후보를 분리한다.").length).toBeGreaterThan(0);
  });

  it("opens a task detail inspector when a work card is selected", () => {
    render(<DashboardContent summary={summary} requestMap={requestMap} />);

    fireEvent.click(screen.getByRole("button", { name: "결과지 문구 수정 후보 상세 보기" }));

    expect(screen.getByText("선택 작업")).toBeInTheDocument();
    expect(screen.getAllByText("결과지 문구 수정 후보").length).toBeGreaterThan(1);
    expect(screen.getByText("담당 에이전트")).toBeInTheDocument();
    expect(screen.getByText("단계 로그")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "실행 로그" })).toHaveAttribute("href", "/activity?taskId=task-1");
    expect(screen.getAllByRole("link", { name: "승인함" }).some((link) =>
      link.getAttribute("href") === "/approvals?approvalId=approval-1",
    )).toBe(true);
  });

  it("shows the approval revision loop and links to the generated rework candidate", () => {
    const originalCandidate = requestMap[0].candidates[0];
    const revisionCandidate = {
      ...originalCandidate,
      id: "candidate-revision-1",
      task_id: null,
      workflow_run_id: null,
      approval_id: null,
      title: "결과지 문구 수정 재작업 후보",
      summary: "수정요청 사유를 반영해 다시 실행할 후보입니다.",
      status: "draft",
      current_step: null,
      current_step_index: 1,
      href: "/?candidateId=candidate-revision-1",
      activity_href: null,
      revision_source_approval_id: "approval-1",
      revision_source_candidate_id: "candidate-1",
      revision_source_task_id: "task-1",
      revision_reason: "상담형 문장으로 더 부드럽게 다시 작성",
      revision_candidate_id: null,
      revision_candidate_title: null,
      revision_candidate_href: null,
      steps: [],
    };
    const revisionMap: RequestMapItem[] = [
      {
        ...requestMap[0],
        candidates: [
          {
            ...originalCandidate,
            status: "revise_requested",
            revision_candidate_id: "candidate-revision-1",
            revision_candidate_title: "결과지 문구 수정 재작업 후보",
            revision_candidate_href: "/?candidateId=candidate-revision-1",
            revision_candidate_status: "pending_approval",
            revision_candidate_task_id: "task-revision-1",
            revision_candidate_workflow_run_id: "run-revision-1",
            revision_candidate_activity_href: "/activity?taskId=task-revision-1",
            revision_candidate_approval_id: "approval-revision-1",
            revision_candidate_approval_href: "/approvals?approvalId=approval-revision-1",
          },
          revisionCandidate,
        ],
      },
    ];

    render(<DashboardContent summary={summary} requestMap={revisionMap} focusCandidateId="candidate-1" />);

    expect(screen.getByText("수정요청 루프")).toBeInTheDocument();
    expect(screen.getByText("재작업 연결")).toBeInTheDocument();
    expect(screen.getAllByText("결과지 문구 수정 재작업 후보").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "재작업 맵" })).toHaveAttribute(
      "href",
      "/map?candidateId=candidate-revision-1",
    );
    expect(screen.getByRole("link", { name: "재작업 실행 로그" })).toHaveAttribute(
      "href",
      "/activity?taskId=task-revision-1",
    );
    expect(screen.getByRole("link", { name: "새 승인 카드" })).toHaveAttribute(
      "href",
      "/approvals?approvalId=approval-revision-1",
    );

    fireEvent.click(screen.getByRole("button", { name: "결과지 문구 수정 재작업 후보 상세 보기" }));

    expect(screen.getAllByText("재작업 후보").length).toBeGreaterThan(0);
    expect(screen.getAllByText("상담형 문장으로 더 부드럽게 다시 작성").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "원 승인 보기" })).toHaveAttribute(
      "href",
      "/approvals?approvalId=approval-1",
    );
    expect(screen.getByRole("link", { name: "원 실행 로그" })).toHaveAttribute("href", "/activity?taskId=task-1");
  });

  it("uses a fixed readable board instead of zooming and panning controls", () => {
    render(<DashboardContent summary={summary} requestMap={requestMap} />);

    const canvas = screen.getByTestId("request-flow-canvas");

    expect(canvas).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "확대" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "축소" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "리셋" })).not.toBeInTheDocument();
  });
});

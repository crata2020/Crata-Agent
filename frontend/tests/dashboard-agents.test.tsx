import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DashboardContent } from "@/app/page";
import { runCandidate } from "@/lib/api";
import { agentSeeds } from "@/lib/agent-seeds";
import type { AgentActivity, DashboardSummary } from "@/lib/types";
import sharedAgentSeeds from "../../shared/agent-seeds.json";

vi.mock("@/lib/api", () => ({
  getAgentActivity: vi.fn(),
  getDashboardSummary: vi.fn(),
  runCandidate: vi.fn(),
}));

const runCandidateMock = vi.mocked(runCandidate);

describe("dashboard agent flow map", () => {
  const summary: DashboardSummary = {
    agent_count: 10,
    active_agent_count: 7,
    candidate_task_count: 4,
    running_task_count: 1,
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
    activity_status:
      agent.id === "report_editor" || agent.id === "case_learner"
        ? "waiting_approval"
        : agent.id === "counseling_coach"
          ? "queued"
          : agent.enabled
            ? "idle"
            : "planned",
    current_focus:
      agent.id === "report_editor"
        ? "결과지 문구 수정 후보 승인 요청"
        : agent.id === "case_learner"
          ? "결과지 문구 수정 재작업 후보"
        : agent.id === "counseling_coach"
          ? "상담 전사록 사례 분리 후보"
        : agent.enabled
          ? "새 요청 대기"
          : "2차 확장 준비",
    current_task_title:
      agent.id === "report_editor"
        ? "결과지 문구 수정 후보 승인 요청"
        : agent.id === "case_learner"
          ? "결과지 문구 수정 재작업 후보"
        : agent.id === "counseling_coach"
          ? "상담 전사록 사례 분리 후보"
          : null,
    current_task_type:
      agent.id === "report_editor"
        ? "report_phrase_revision"
        : agent.id === "case_learner"
          ? "report_phrase_revision"
        : agent.id === "counseling_coach"
          ? "counseling_case_learning"
          : null,
    workload_count: agent.id === "report_editor" ? 2 : agent.id === "counseling_coach" || agent.id === "case_learner" ? 1 : 0,
    pending_approval_count: agent.id === "report_editor" ? 1 : 0,
    candidate_count: agent.id === "counseling_coach" || agent.id === "case_learner" ? 1 : 0,
    work_items:
      agent.id === "report_editor"
        ? [
            {
              id: "approval-1",
              source_type: "approval",
              title: "결과지 문구 수정 후보 승인 요청",
              summary: "공식 반영 전 결과지 문구 수정 초안을 검토합니다.",
              task_type: "report_phrase_revision",
              status: "pending_approval",
              href: "/approvals?approvalId=approval-1",
            },
          ]
        : agent.id === "case_learner"
          ? [
              {
                id: "candidate-revision",
                source_type: "candidate",
                title: "결과지 문구 수정 재작업 후보",
                summary: "수정 사유: 문장을 더 상담형으로 바꿔 주세요.",
                task_type: "report_phrase_revision",
                status: "draft",
                href: "/request-intake?candidateId=candidate-revision",
              },
            ]
        : agent.id === "counseling_coach"
          ? [
              {
                id: "candidate-1",
                source_type: "candidate",
                title: "상담 전사록 사례 분리 후보",
                summary: "상담 전사록에서 사례 학습 후보와 관계 패턴을 분리합니다.",
                task_type: "counseling_case_learning",
                status: "draft",
                href: "/request-intake?candidateId=candidate-1",
              },
            ]
          : [],
  }));

  beforeEach(() => {
    runCandidateMock.mockReset();
  });

  it("uses the shared agent seed source", () => {
    expect(agentSeeds).toEqual(sharedAgentSeeds);
  });

  it("renders the command-centre sidebar and agent flow canvas", () => {
    render(<DashboardContent summary={summary} agentActivity={activity} />);

    expect(screen.getByText("CRATA Office")).toBeInTheDocument();
    expect(screen.getByText("Command Centre")).toBeInTheDocument();
    expect(screen.getByText("운영 맵")).toBeInTheDocument();
    expect(screen.getByText("요청 콘솔")).toBeInTheDocument();
    expect(screen.getAllByText("승인함").length).toBeGreaterThan(0);
    expect(screen.getByText("Agent Flow")).toBeInTheDocument();
    expect(screen.getByText("CRATA 직원 작업 맵")).toBeInTheDocument();
  });

  it("renders every agent as a node with its current work", () => {
    render(<DashboardContent summary={summary} agentActivity={activity} />);

    for (const agent of sharedAgentSeeds) {
      expect(screen.getAllByText(agent.display_name).length).toBeGreaterThan(0);
    }

    expect(screen.getAllByText("결과지 문구 수정 후보 승인 요청").length).toBeGreaterThan(0);
    expect(screen.getAllByText("승인 대기").length).toBeGreaterThan(0);
    expect(screen.getAllByText("확장 예정").length).toBeGreaterThan(0);
  });

  it("selects an agent node and marks it as active", () => {
    render(<DashboardContent summary={summary} agentActivity={activity} />);

    const counselingCoach = screen.getByRole("button", { name: "상담 코치 상세 보기" });

    expect(counselingCoach).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(counselingCoach);

    expect(counselingCoach).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Agent Inspector")).toBeInTheDocument();
    expect(screen.getAllByText("상담 코치").length).toBeGreaterThan(1);
    expect(screen.getAllByText("상담 전사록 사례 분리 후보").length).toBeGreaterThan(0);
    expect(screen.getByText("상담 전사록에서 사례 학습 후보와 관계 패턴을 분리합니다.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /상담 전사록 사례 분리 후보/ })).toHaveAttribute(
      "href",
      "/request-intake?candidateId=candidate-1",
    );
    expect(screen.getByRole("button", { name: "바로 실행" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "후보 보기" })).toHaveAttribute("href", "/request-intake");
    expect(screen.getAllByRole("link", { name: "승인함" }).length).toBeGreaterThan(0);
  });

  it("runs a candidate directly from the inspector and changes it to an approval action", async () => {
    runCandidateMock.mockResolvedValue({
      task_id: "task-1",
      workflow_run_id: "run-1",
      artifact_id: "artifact-1",
      approval_id: "approval-new",
      status: "pending_approval",
    });
    render(<DashboardContent summary={summary} agentActivity={activity} />);

    fireEvent.click(screen.getByRole("button", { name: "상담 코치 상세 보기" }));
    fireEvent.click(screen.getByRole("button", { name: "바로 실행" }));

    await waitFor(() => expect(runCandidateMock).toHaveBeenCalledWith("candidate-1"));

    expect(await screen.findByText("실행 완료. 승인함에서 검토하세요.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "승인함 이동" })).toHaveAttribute(
      "href",
      "/approvals?approvalId=approval-new",
    );
  });

  it("shows approval and revision quick actions in the inspector", () => {
    render(<DashboardContent summary={summary} agentActivity={activity} />);

    fireEvent.click(screen.getByRole("button", { name: "결과지 에디터 상세 보기" }));
    expect(screen.getByRole("link", { name: "승인함 이동" })).toHaveAttribute(
      "href",
      "/approvals?approvalId=approval-1",
    );

    fireEvent.click(screen.getByRole("button", { name: "사례학습가 상세 보기" }));
    expect(screen.getByRole("link", { name: "수정요청 확인" })).toHaveAttribute(
      "href",
      "/request-intake?candidateId=candidate-revision",
    );
  });

  it("shows map controls for zoom, reset, and movement", () => {
    render(<DashboardContent summary={summary} agentActivity={activity} />);

    const canvas = screen.getByTestId("agent-flow-canvas");
    expect(screen.getByRole("button", { name: "확대" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "축소" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "리셋" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "이동 모드" })).toBeInTheDocument();

    fireEvent.wheel(canvas, { deltaY: -120 });
    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100 });
    fireEvent.pointerMove(canvas, { clientX: 140, clientY: 130 });
    fireEvent.pointerUp(canvas);

    expect(canvas).toBeInTheDocument();
  });
});

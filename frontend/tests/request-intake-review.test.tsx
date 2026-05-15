import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import RequestIntakePage from "@/app/request-intake/page";
import { createIntake, runCandidate } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  createIntake: vi.fn(),
  runCandidate: vi.fn(),
}));

const createIntakeMock = vi.mocked(createIntake);
const runCandidateMock = vi.mocked(runCandidate);

const candidateTasks = [
  {
    id: "candidate-report",
    task_type: "report_phrase_revision",
    title: "결과지 문구 수정 후보",
    summary: "검사 결과지 문구 수정 요청입니다.",
    evidence_excerpt: "조직행동검사 5페이지 문구를 수정하자.",
    recommended_agents: ["crata_ceo", "report_editor"],
    status: "draft",
  },
  {
    id: "candidate-case",
    task_type: "counseling_case_learning",
    title: "상담 사례 학습 후보",
    summary: "상담 사례 학습 요청입니다.",
    evidence_excerpt: "A유형 B유형 상담 사례는 학습 후보로 저장하자.",
    recommended_agents: ["case_learner", "relationship_analyst"],
    status: "draft",
  },
];

describe("RequestIntakePage candidate review", () => {
  beforeEach(() => {
    createIntakeMock.mockReset();
    runCandidateMock.mockReset();
  });

  it("shows a review workspace for extracted candidates and lets the user hold one", async () => {
    createIntakeMock.mockResolvedValue({
      id: "intake-1",
      title: "회의록",
      input_type: "meeting_notes",
      raw_content: "원문",
      candidate_tasks: candidateTasks,
    });

    render(<RequestIntakePage />);

    fireEvent.change(screen.getByLabelText("원문"), {
      target: { value: "조직행동검사 5페이지 문구를 수정하고 상담 사례는 학습 후보로 저장하자." },
    });
    fireEvent.click(screen.getByRole("button", { name: "작업 후보 추출" }));

    expect(await screen.findByText("작업 후보 검토")).toBeInTheDocument();
    expect(screen.getByText("실행 대상 2개 / 전체 2개")).toBeInTheDocument();
    expect(screen.getByText("결과지 문구 수정")).toBeInTheDocument();
    expect(screen.getByText("상담 사례 학습")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: "상담 사례 학습 후보 실행 대상" }));

    expect(screen.getByText("실행 대상 1개 / 전체 2개")).toBeInTheDocument();
    expect(screen.getAllByText("보류됨").length).toBeGreaterThan(0);
  });

  it("runs only candidates kept as execution targets", async () => {
    createIntakeMock.mockResolvedValue({
      id: "intake-1",
      title: "회의록",
      input_type: "meeting_notes",
      raw_content: "원문",
      candidate_tasks: candidateTasks,
    });
    runCandidateMock.mockResolvedValue({
      task_id: "task-1",
      workflow_run_id: "run-1",
      artifact_id: "artifact-1",
      approval_id: "approval-1",
      status: "pending_approval",
    });

    render(<RequestIntakePage />);

    fireEvent.change(screen.getByLabelText("원문"), {
      target: { value: "조직행동검사 5페이지 문구를 수정하고 상담 사례는 학습 후보로 저장하자." },
    });
    fireEvent.click(screen.getByRole("button", { name: "작업 후보 추출" }));

    await screen.findByText("작업 후보 검토");
    fireEvent.click(screen.getByRole("checkbox", { name: "상담 사례 학습 후보 실행 대상" }));
    fireEvent.click(screen.getAllByRole("button", { name: "작업 실행" })[0]);

    await waitFor(() => expect(runCandidateMock).toHaveBeenCalledWith("candidate-report"));
    expect(runCandidateMock).toHaveBeenCalledTimes(1);
  });
});

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import RequestIntakePage from "@/app/request-intake/page";
import { createIntake, listCandidateTasks, runCandidate, runCandidates, updateCandidate } from "@/lib/api";

const searchParamsState = vi.hoisted(() => ({ value: "" }));

vi.mock("next/navigation", () => ({
  usePathname: () => "/request-intake",
  useSearchParams: () => new URLSearchParams(searchParamsState.value),
}));

vi.mock("@/lib/api", () => ({
  createIntake: vi.fn(),
  listCandidateTasks: vi.fn(),
  runCandidate: vi.fn(),
  runCandidates: vi.fn(),
  updateCandidate: vi.fn(),
}));

const createIntakeMock = vi.mocked(createIntake);
const listCandidateTasksMock = vi.mocked(listCandidateTasks);
const runCandidateMock = vi.mocked(runCandidate);
const runCandidatesMock = vi.mocked(runCandidates);
const updateCandidateMock = vi.mocked(updateCandidate);

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
    evidence_excerpt: "A유형 B유형 상담 전사록은 학습 후보로 저장하자.",
    recommended_agents: ["case_learner", "relationship_analyst"],
    status: "draft",
  },
];

describe("RequestIntakePage candidate review", () => {
  beforeEach(() => {
    createIntakeMock.mockReset();
    listCandidateTasksMock.mockReset();
    runCandidateMock.mockReset();
    runCandidatesMock.mockReset();
    updateCandidateMock.mockReset();
    searchParamsState.value = "";
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
      target: { value: "조직행동검사 5페이지 문구를 수정하고 상담 사례를 학습 후보로 저장하자." },
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
      target: { value: "조직행동검사 5페이지 문구를 수정하고 상담 사례를 학습 후보로 저장하자." },
    });
    fireEvent.click(screen.getByRole("button", { name: "작업 후보 추출" }));

    await screen.findByText("작업 후보 검토");
    fireEvent.click(screen.getByRole("checkbox", { name: "상담 사례 학습 후보 실행 대상" }));
    fireEvent.click(screen.getAllByRole("button", { name: "작업 실행" })[0]);

    await waitFor(() => expect(runCandidateMock).toHaveBeenCalledWith("candidate-report"));
    expect(runCandidateMock).toHaveBeenCalledTimes(1);
  });

  it("loads and highlights a candidate linked from the dashboard", async () => {
    searchParamsState.value = "candidateId=candidate-case";
    listCandidateTasksMock.mockResolvedValue(candidateTasks);

    render(<RequestIntakePage />);

    await waitFor(() => expect(listCandidateTasksMock).toHaveBeenCalledTimes(1));

    expect(await screen.findByText("대시보드에서 선택한 후보를 표시합니다.")).toBeInTheDocument();
    expect(screen.getByText("상담 사례 학습 후보 항목이 아래 목록에서 강조됩니다.")).toBeInTheDocument();
    expect(screen.getByText("대시보드 선택")).toBeInTheDocument();
    expect(screen.getByText("실행 대상 2개 / 전체 2개")).toBeInTheDocument();
  });

  it("runs all selected candidates at once and links to the approval inbox", async () => {
    createIntakeMock.mockResolvedValue({
      id: "intake-1",
      title: "회의록",
      input_type: "meeting_notes",
      raw_content: "원문",
      candidate_tasks: candidateTasks,
    });
    runCandidatesMock.mockResolvedValue({
      results: [
        {
          candidate_id: "candidate-report",
          task_id: "task-1",
          workflow_run_id: "run-1",
          artifact_id: "artifact-1",
          approval_id: "approval-1",
          status: "pending_approval",
        },
      ],
    });

    render(<RequestIntakePage />);

    fireEvent.change(screen.getByLabelText("원문"), {
      target: { value: "조직행동검사 5페이지 문구를 수정하고 상담 사례를 학습 후보로 저장하자." },
    });
    fireEvent.click(screen.getByRole("button", { name: "작업 후보 추출" }));

    await screen.findByText("작업 후보 검토");
    fireEvent.click(screen.getByRole("checkbox", { name: "상담 사례 학습 후보 실행 대상" }));
    fireEvent.click(screen.getByRole("button", { name: "선택 후보 한 번에 실행" }));

    await waitFor(() => expect(runCandidatesMock).toHaveBeenCalledWith(["candidate-report"]));
    expect(await screen.findByText("선택 후보 1개를 실행했습니다. 승인함에서 검토하세요.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "승인함으로 이동" })).toHaveAttribute("href", "/approvals");
    expect(screen.getByText("승인 ID: approval-1")).toBeInTheDocument();
  });

  it("edits and saves candidate title, summary, and recommended agents before execution", async () => {
    createIntakeMock.mockResolvedValue({
      id: "intake-1",
      title: "회의록",
      input_type: "meeting_notes",
      raw_content: "원문",
      candidate_tasks: candidateTasks,
    });
    updateCandidateMock.mockResolvedValue({
      ...candidateTasks[0],
      title: "조직행동검사 5페이지 문구 수정",
      summary: "상담형 결과지 문장으로 수정합니다.",
      recommended_agents: ["crata_ceo", "report_editor", "quality_inspector"],
    });

    render(<RequestIntakePage />);

    fireEvent.change(screen.getByLabelText("원문"), {
      target: { value: "조직행동검사 5페이지 문구를 수정하자." },
    });
    fireEvent.click(screen.getByRole("button", { name: "작업 후보 추출" }));

    await screen.findByText("작업 후보 검토");
    fireEvent.click(screen.getAllByRole("button", { name: "후보 수정" })[0]);
    fireEvent.change(screen.getByLabelText("후보 제목"), {
      target: { value: "조직행동검사 5페이지 문구 수정" },
    });
    fireEvent.change(screen.getByLabelText("후보 요약"), {
      target: { value: "상담형 결과지 문장으로 수정합니다." },
    });
    expect(screen.queryByRole("textbox", { name: "추천 에이전트" })).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "CRATA CEO 선택" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "결과지 에디터 선택" })).toBeChecked();
    fireEvent.click(screen.getByRole("checkbox", { name: "품질검수관 선택" }));
    fireEvent.click(screen.getByRole("button", { name: "후보 저장" }));

    await waitFor(() =>
      expect(updateCandidateMock).toHaveBeenCalledWith("candidate-report", {
        title: "조직행동검사 5페이지 문구 수정",
        summary: "상담형 결과지 문장으로 수정합니다.",
        recommended_agents: ["crata_ceo", "report_editor", "quality_inspector"],
      }),
    );
    expect(await screen.findByText("후보를 저장했습니다.")).toBeInTheDocument();
    expect(screen.getByText("조직행동검사 5페이지 문구 수정")).toBeInTheDocument();
    expect(screen.getByText("상담형 결과지 문장으로 수정합니다.")).toBeInTheDocument();
    expect(screen.getByText("품질검수관")).toBeInTheDocument();
  });

  it("requires at least one selected agent before saving a candidate", async () => {
    createIntakeMock.mockResolvedValue({
      id: "intake-1",
      title: "회의록",
      input_type: "meeting_notes",
      raw_content: "원문",
      candidate_tasks: candidateTasks,
    });

    render(<RequestIntakePage />);

    fireEvent.change(screen.getByLabelText("원문"), {
      target: { value: "조직행동검사 5페이지 문구를 수정하자." },
    });
    fireEvent.click(screen.getByRole("button", { name: "작업 후보 추출" }));

    await screen.findByText("작업 후보 검토");
    fireEvent.click(screen.getAllByRole("button", { name: "후보 수정" })[0]);
    fireEvent.click(screen.getByRole("checkbox", { name: "CRATA CEO 선택" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "결과지 에디터 선택" }));
    fireEvent.click(screen.getByRole("button", { name: "후보 저장" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("추천 에이전트를 1명 이상 선택하세요.");
    expect(updateCandidateMock).not.toHaveBeenCalled();
  });
});

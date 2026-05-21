import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApprovalCard } from "@/components/approval-card";
import { decideApproval } from "@/lib/api";
import type { Approval } from "@/lib/types";

const refreshMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}));

vi.mock("@/lib/api", () => ({
  decideApproval: vi.fn(),
}));

const decideApprovalMock = vi.mocked(decideApproval);

const pendingApproval: Approval = {
  id: "approval-1",
  task_id: "task-1",
  artifact_id: "artifact-1",
  approval_type: "artifact_review",
  title: "조직행동검사 5페이지 문구 수정",
  summary: "공식 문구 반영 전 검토가 필요합니다.",
  status: "pending_approval",
  before_content: "기존 문구",
  after_content: "수정된 문구",
  affected_area: "조직행동검사 5페이지",
  reviewer_note: "공식 반영 전 톤을 확인하세요.",
  knowledge_references: [
    "knowledge/official/personal-behavior-motivation/MASTER.md",
    "knowledge/official/group-behavior/MASTER.md",
    "knowledge/agent-guides/agent-operating-guides.md",
  ],
};

describe("ApprovalCard", () => {
  beforeEach(() => {
    decideApprovalMock.mockReset();
    refreshMock.mockReset();
  });

  it("renders reviewer note and decision buttons for pending approvals", () => {
    render(<ApprovalCard approval={pendingApproval} />);

    expect(screen.getByText("검토 메모")).toBeInTheDocument();
    expect(screen.getByText("변경 후 내용")).toBeInTheDocument();
    expect(screen.queryByText("Reviewer Note")).not.toBeInTheDocument();
    expect(screen.queryByText("After Content")).not.toBeInTheDocument();
    expect(screen.getByText("공식 반영 전 톤을 확인하세요.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "승인" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "거절" })).toBeEnabled();
    expect(screen.getByText("수정된 문구")).toBeInTheDocument();
  });

  it("shows referenced knowledge files for approval traceability", () => {
    render(<ApprovalCard approval={pendingApproval} />);

    expect(screen.getByText("참조 지식")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "개인행동 동기검사 MASTER" })).toHaveAttribute(
      "href",
      "/memory?query=%EA%B0%9C%EC%9D%B8%ED%96%89%EB%8F%99%20%EB%8F%99%EA%B8%B0%EA%B2%80%EC%82%AC%20MASTER",
    );
    expect(screen.getByText("집단행동검사 MASTER")).toBeInTheDocument();
    expect(screen.getByText("에이전트 작업 가이드")).toBeInTheDocument();
  });

  it("links back to the workflow activity for the approval task", () => {
    render(<ApprovalCard approval={pendingApproval} />);

    expect(screen.getByRole("link", { name: "실행 흐름 보기" })).toHaveAttribute(
      "href",
      "/activity?taskId=task-1",
    );
  });

  it("compares the original draft and rework draft when revision data is available", () => {
    render(
      <ApprovalCard
        approval={{
          ...pendingApproval,
          comparison: {
            source_approval_id: "approval-original",
            source_task_id: "task-original",
            source_title: "결과지 문구 수정 원 승인",
            source_status: "revise_requested",
            source_after_content: "원본 초안 문장입니다. 유지 문장입니다.",
            revision_reason: "상담형 문장으로 더 부드럽게 다시 작성",
            revision_candidate_id: "candidate-rework",
            revision_candidate_status: "pending_approval",
            revision_task_id: "task-rework",
            revision_approval_id: "approval-rework",
            revision_title: "결과지 문구 수정 재작업 승인",
            revision_status: "pending_approval",
            revision_after_content: "재작업 초안 문장입니다. 유지 문장입니다.",
          },
        }}
      />,
    );

    expect(screen.getByText("재작업 비교")).toBeInTheDocument();
    expect(screen.getByText("원본 초안")).toBeInTheDocument();
    expect(screen.getByText("재작업 초안")).toBeInTheDocument();
    expect(screen.getByText("문장 변경점")).toBeInTheDocument();
    expect(screen.getByText("삭제됨")).toBeInTheDocument();
    expect(screen.getByText("추가됨")).toBeInTheDocument();
    expect(screen.getByText("유지")).toBeInTheDocument();
    expect(screen.getByText("원본 초안 문장입니다.")).toBeInTheDocument();
    expect(screen.getByText("재작업 초안 문장입니다.")).toBeInTheDocument();
    expect(screen.getByText("유지 문장입니다.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "원 승인 보기" })).toHaveAttribute(
      "href",
      "/approvals?approvalId=approval-original",
    );
    expect(screen.getByRole("link", { name: "재작업 승인 보기" })).toHaveAttribute(
      "href",
      "/approvals?approvalId=approval-rework",
    );
  });

  it("marks the card highlighted when opened from the dashboard", () => {
    render(<ApprovalCard approval={pendingApproval} highlighted />);

    expect(screen.getByText("대시보드 선택")).toBeInTheDocument();
    expect(screen.getByRole("article")).toHaveAttribute("aria-current", "true");
  });

  it("locks the card after a successful approval decision", async () => {
    decideApprovalMock.mockResolvedValue({ ...pendingApproval, status: "approved" });

    render(<ApprovalCard approval={pendingApproval} />);

    const approveButton = screen.getByRole("button", { name: "승인" });
    fireEvent.click(approveButton);

    expect(approveButton).toBeDisabled();
    expect(screen.getByRole("button", { name: "거절" })).toBeDisabled();

    await waitFor(() => expect(refreshMock).toHaveBeenCalledTimes(1));
    fireEvent.click(approveButton);

    expect(decideApprovalMock).toHaveBeenCalledTimes(1);
    expect(decideApprovalMock).toHaveBeenCalledWith("approval-1", "approved");
    expect(screen.queryByRole("button", { name: "승인" })).not.toBeInTheDocument();
    expect(screen.getByText("최종 상태: 승인됨")).toBeInTheDocument();
  });

  it("shows an error and re-enables controls when a decision fails", async () => {
    decideApprovalMock.mockRejectedValue(new Error("처리 실패"));

    render(<ApprovalCard approval={pendingApproval} />);

    fireEvent.click(screen.getByRole("button", { name: "승인" }));

    await screen.findByRole("alert");

    expect(screen.getByText("처리 실패")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "승인" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "거절" })).toBeEnabled();
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("asks for a revision reason and shows the generated rework candidate", async () => {
    decideApprovalMock.mockResolvedValue({
      ...pendingApproval,
      status: "revise_requested",
      revision_candidate_task: {
        id: "candidate-revision-1",
        task_type: "report_phrase_revision",
        title: "조직행동검사 5페이지 문구 수정 재작업 후보",
        summary: "수정 사유: 문장을 더 상담형으로 바꿔 주세요.",
        evidence_excerpt: "문장을 더 상담형으로 바꿔 주세요.",
        recommended_agents: ["crata_ceo", "report_editor"],
        status: "draft",
      },
    });

    render(<ApprovalCard approval={pendingApproval} />);

    fireEvent.click(screen.getByRole("button", { name: "수정요청" }));
    expect(screen.getByLabelText("수정 사유")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("수정 사유"), {
      target: { value: "문장을 더 상담형으로 바꿔 주세요." },
    });
    fireEvent.click(screen.getByRole("button", { name: "수정요청 확정" }));

    await waitFor(() => expect(refreshMock).toHaveBeenCalledTimes(1));

    expect(decideApprovalMock).toHaveBeenCalledWith(
      "approval-1",
      "revise_requested",
      "문장을 더 상담형으로 바꿔 주세요.",
    );
    expect(screen.getByText("최종 상태: 수정요청")).toBeInTheDocument();
    expect(screen.getByText("재작업 후보가 생성되었습니다.")).toBeInTheDocument();
    expect(screen.getByText("조직행동검사 5페이지 문구 수정 재작업 후보")).toBeInTheDocument();
  });

  it("requires a revision reason before submitting a revise request", async () => {
    render(<ApprovalCard approval={pendingApproval} />);

    fireEvent.click(screen.getByRole("button", { name: "수정요청" }));
    fireEvent.click(screen.getByRole("button", { name: "수정요청 확정" }));

    expect(screen.getByRole("alert")).toHaveTextContent("수정 사유를 입력하세요.");
    expect(decideApprovalMock).not.toHaveBeenCalled();
  });

  it("does not show active decision buttons for already decided approvals", () => {
    render(<ApprovalCard approval={{ ...pendingApproval, status: "rejected" }} />);

    expect(screen.queryByRole("button", { name: "승인" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "거절" })).not.toBeInTheDocument();
    expect(screen.getByText("최종 상태: 거절됨")).toBeInTheDocument();
  });
});

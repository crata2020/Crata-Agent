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
};

describe("ApprovalCard", () => {
  beforeEach(() => {
    decideApprovalMock.mockReset();
    refreshMock.mockReset();
  });

  it("renders reviewer note and decision buttons for pending approvals", () => {
    render(<ApprovalCard approval={pendingApproval} />);

    expect(screen.getByText("공식 반영 전 톤을 확인하세요.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "승인" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "거절" })).toBeEnabled();
    expect(screen.getByText("수정된 문구")).toBeInTheDocument();
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

  it("does not show active decision buttons for already decided approvals", () => {
    render(<ApprovalCard approval={{ ...pendingApproval, status: "rejected" }} />);

    expect(screen.queryByRole("button", { name: "승인" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "거절" })).not.toBeInTheDocument();
    expect(screen.getByText("최종 상태: 거절됨")).toBeInTheDocument();
  });
});

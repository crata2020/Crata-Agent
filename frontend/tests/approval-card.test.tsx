import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ApprovalCard } from "@/components/approval-card";
import type { Approval } from "@/lib/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

vi.mock("@/lib/api", () => ({
  decideApproval: vi.fn(),
}));

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
  it("renders reviewer note and decision buttons for pending approvals", () => {
    render(<ApprovalCard approval={pendingApproval} />);

    expect(screen.getByText("공식 반영 전 톤을 확인하세요.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "승인" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "거절" })).toBeEnabled();
    expect(screen.getByText("수정된 문구")).toBeInTheDocument();
  });
});

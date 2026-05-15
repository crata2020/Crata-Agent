import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApprovalInbox } from "@/components/approval-inbox";
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

const approvals: Approval[] = [
  {
    id: "approval-report",
    task_id: "task-report",
    artifact_id: "artifact-report",
    approval_type: "report_phrase_change",
    title: "결과지 문구 수정 후보 승인 요청",
    summary: "검사 결과지 문구를 상담형 문장으로 바꾸는 승인 항목입니다.",
    status: "pending_approval",
    before_content: "",
    after_content: "결과지 문구 수정 초안",
    affected_area: "report_phrase_revision",
    reviewer_note: "공식 지식 반영 전 검토가 필요합니다.",
    knowledge_references: ["knowledge/official/personal-behavior-motivation/MASTER.md"],
  },
  {
    id: "approval-case",
    task_id: "task-case",
    artifact_id: "artifact-case",
    approval_type: "learning_candidate",
    title: "상담 사례 학습 후보 승인 요청",
    summary: "상담 전사록에서 추출한 학습 후보입니다.",
    status: "approved",
    before_content: "",
    after_content: "상담 사례 학습 초안",
    affected_area: "counseling_case_learning",
    reviewer_note: "상담 사례와 공식 지식을 구분했습니다.",
    knowledge_references: ["knowledge/agent-guides/agent-operating-guides.md"],
  },
  {
    id: "approval-revision",
    task_id: "task-revision",
    artifact_id: "artifact-revision",
    approval_type: "artifact_review",
    title: "사업 프로그램 기획 후보 재검토",
    summary: "수정요청된 사업설계자 작업입니다.",
    status: "revise_requested",
    before_content: "",
    after_content: "사업 프로그램 기획 초안",
    affected_area: "business_planning",
    reviewer_note: "대상과 예산을 더 확인해야 합니다.",
    knowledge_references: ["knowledge/official/group-behavior/MASTER.md"],
  },
];

describe("ApprovalInbox", () => {
  beforeEach(() => {
    decideApprovalMock.mockReset();
    refreshMock.mockReset();
  });

  it("filters approvals by status without losing total queue context", () => {
    render(<ApprovalInbox approvals={approvals} />);

    expect(screen.getByText("전체 3개")).toBeInTheDocument();
    expect(screen.getByText("승인대기 1개")).toBeInTheDocument();
    expect(screen.getByText("승인됨 1개")).toBeInTheDocument();
    expect(screen.getByText("수정요청 1개")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "수정요청 1" }));

    expect(screen.getByText("사업 프로그램 기획 후보 재검토")).toBeInTheDocument();
    expect(screen.queryByText("결과지 문구 수정 후보 승인 요청")).not.toBeInTheDocument();
    expect(screen.queryByText("상담 사례 학습 후보 승인 요청")).not.toBeInTheDocument();
    expect(screen.getByText("표시 중 1개 / 전체 3개")).toBeInTheDocument();
  });

  it("searches approvals by title, summary, task type, and reviewer note", () => {
    render(<ApprovalInbox approvals={approvals} />);

    fireEvent.change(screen.getByLabelText("승인 항목 검색"), {
      target: { value: "전사록" },
    });

    expect(screen.getByText("상담 사례 학습 후보 승인 요청")).toBeInTheDocument();
    expect(screen.queryByText("결과지 문구 수정 후보 승인 요청")).not.toBeInTheDocument();
    expect(screen.queryByText("사업 프로그램 기획 후보 재검토")).not.toBeInTheDocument();
  });

  it("shows a focused empty state when filters hide all approvals", () => {
    render(<ApprovalInbox approvals={approvals} />);

    fireEvent.change(screen.getByLabelText("승인 항목 검색"), {
      target: { value: "없는 항목" },
    });

    expect(screen.getByText("조건에 맞는 승인 항목이 없습니다.")).toBeInTheDocument();
    expect(screen.getByText("검색어나 상태 필터를 조정하세요.")).toBeInTheDocument();
  });
});

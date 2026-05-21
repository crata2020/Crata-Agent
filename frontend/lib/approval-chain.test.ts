import { describe, expect, it } from "vitest";

import { collectApprovalChain } from "./approval-chain";
import type { Approval } from "./types";

function approval(id: string, revisionApprovalId?: string | null): Approval {
  return {
    id,
    task_id: `task-${id}`,
    artifact_id: `artifact-${id}`,
    approval_type: "general_review",
    title: `Approval ${id}`,
    summary: "",
    status: "pending_approval",
    before_content: "",
    after_content: "",
    affected_area: "general_agent_task",
    reviewer_note: "",
    comparison: {
      source_approval_id: "approval-original",
      source_task_id: "task-original",
      source_title: "Original",
      source_status: "revise_requested",
      source_after_content: "",
      revision_reason: "revise",
      revision_approval_id: revisionApprovalId,
    },
  };
}

describe("collectApprovalChain", () => {
  it("stops when a revision approval points to itself", () => {
    const approvals = [
      approval("approval-original", "approval-revision"),
      approval("approval-revision", "approval-revision"),
    ];

    const chain = collectApprovalChain({
      approvals,
      rootApprovalId: "approval-original",
    });

    expect(chain.map((item) => item.approval.id)).toEqual([
      "approval-original",
      "approval-revision",
    ]);
    expect(chain.map((item) => item.isRevision)).toEqual([false, true]);
    expect(chain[1].originalApproval?.id).toBe("approval-original");
  });
});

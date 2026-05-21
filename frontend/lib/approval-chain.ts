import type { Approval } from "./types";

export type ApprovalChainItem = {
  approval: Approval;
  isRevision: boolean;
  originalApproval: Approval | null;
};

export function collectApprovalChain({
  approvals,
  rootApprovalId,
}: {
  approvals: Approval[];
  rootApprovalId: string | null | undefined;
}): ApprovalChainItem[] {
  if (!rootApprovalId) return [];

  const chain: ApprovalChainItem[] = [];
  const visitedApprovalIds = new Set<string>();
  let currentApprovalId = rootApprovalId;

  while (currentApprovalId && !visitedApprovalIds.has(currentApprovalId)) {
    visitedApprovalIds.add(currentApprovalId);

    const currentApproval = approvals.find((approval) => approval.id === currentApprovalId);
    if (!currentApproval) break;

    const originalApproval =
      chain.length === 0
        ? null
        : approvals.find(
            (approval) => approval.comparison?.revision_approval_id === currentApproval.id,
          ) || null;

    chain.push({
      approval: currentApproval,
      isRevision: chain.length > 0,
      originalApproval,
    });

    const nextApprovalId = currentApproval.comparison?.revision_approval_id || "";
    if (nextApprovalId === currentApprovalId) break;
    currentApprovalId = nextApprovalId;
  }

  return chain;
}

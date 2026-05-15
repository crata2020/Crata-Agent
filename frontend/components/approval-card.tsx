"use client";

import { Check, RotateCcw, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { decideApproval, type ApprovalDecision } from "@/lib/api";
import type { Approval, ApprovalStatus } from "@/lib/types";

interface ApprovalCardProps {
  approval: Approval;
}

const statusLabels: Record<ApprovalStatus, string> = {
  pending_approval: "승인대기",
  waiting_for_approval: "승인대기",
  approved: "승인됨",
  rejected: "거절됨",
  revise_requested: "수정요청",
};

const decisionLabels: Record<ApprovalDecision, string> = {
  approved: "승인",
  rejected: "거절",
  revise_requested: "수정요청",
};

export function ApprovalCard({ approval }: ApprovalCardProps) {
  const router = useRouter();
  const [pendingDecision, setPendingDecision] = useState<ApprovalDecision | null>(null);
  const [decidedStatus, setDecidedStatus] = useState<ApprovalDecision | null>(null);
  const [isRevisionFormOpen, setIsRevisionFormOpen] = useState(false);
  const [revisionReason, setRevisionReason] = useState("");
  const [revisionCandidate, setRevisionCandidate] = useState(approval.revision_candidate_task ?? null);
  const [error, setError] = useState("");
  const currentStatus = decidedStatus ?? approval.status;
  const canDecide = approval.status === "pending_approval" && decidedStatus === null;

  async function handleDecision(decision: ApprovalDecision, reason = "") {
    if (!canDecide || pendingDecision !== null) {
      return;
    }

    setPendingDecision(decision);
    setError("");

    try {
      const decidedApproval = reason
        ? await decideApproval(approval.id, decision, reason)
        : await decideApproval(approval.id, decision);
      setDecidedStatus(decision);
      if (decidedApproval.revision_candidate_task) {
        setRevisionCandidate(decidedApproval.revision_candidate_task);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "승인 처리에 실패했습니다.");
      setPendingDecision(null);
    }
  }

  function openRevisionForm() {
    setIsRevisionFormOpen(true);
    setError("");
  }

  function cancelRevisionForm() {
    setIsRevisionFormOpen(false);
    setRevisionReason("");
    setError("");
  }

  function submitRevisionRequest() {
    const reason = revisionReason.trim();
    if (!reason) {
      setError("수정 사유를 입력하세요.");
      return;
    }

    void handleDecision("revise_requested", reason);
  }

  return (
    <article className="rounded-card border border-border bg-surface p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-button bg-surfaceAlt px-2 py-1 text-xs font-semibold text-primary">
              {statusLabels[currentStatus] ?? currentStatus}
            </span>
            <span className="text-xs font-medium text-[#5F6B64]">{approval.affected_area}</span>
          </div>
          <h2 className="mt-3 text-base font-semibold text-[#1F2723]">{approval.title}</h2>
          <p className="mt-2 text-sm leading-6 text-[#5F6B64]">{approval.summary}</p>
        </div>

        {canDecide ? (
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleDecision("approved")}
              disabled={pendingDecision !== null}
              className="inline-flex h-9 items-center gap-1.5 rounded-button bg-success px-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Check size={16} aria-hidden="true" />
              {decisionLabels.approved}
            </button>
            <button
              type="button"
              onClick={() => handleDecision("rejected")}
              disabled={pendingDecision !== null}
              className="inline-flex h-9 items-center gap-1.5 rounded-button bg-danger px-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <X size={16} aria-hidden="true" />
              {decisionLabels.rejected}
            </button>
            <button
              type="button"
              onClick={openRevisionForm}
              disabled={pendingDecision !== null}
              className="inline-flex h-9 items-center gap-1.5 rounded-button border border-border bg-surface px-3 text-sm font-semibold text-[#1F2723] transition hover:bg-surfaceAlt disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RotateCcw size={16} aria-hidden="true" />
              {decisionLabels.revise_requested}
            </button>
          </div>
        ) : (
          <div className="shrink-0 rounded-button border border-border bg-surfaceAlt px-3 py-2 text-sm font-semibold text-[#5F6B64]">
            최종 상태: {statusLabels[currentStatus] ?? currentStatus}
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <section className="rounded-card border border-border bg-surfaceAlt p-3">
          <h3 className="text-xs font-semibold uppercase tracking-normal text-[#5F6B64]">Reviewer Note</h3>
          <p className="mt-2 text-sm leading-6 text-[#1F2723]">{approval.reviewer_note || "검토 메모가 없습니다."}</p>
        </section>
        <section className="rounded-card border border-border bg-[#0F172A] p-3 text-white">
          <h3 className="text-xs font-semibold uppercase tracking-normal text-[#CBD5E1]">After Content</h3>
          <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap text-xs leading-5">
            <code>{approval.after_content}</code>
          </pre>
        </section>
      </div>

      {isRevisionFormOpen && canDecide ? (
        <section className="mt-4 rounded-card border border-approval/40 bg-[#FFF8EC] p-3">
          <label className="block">
            <span className="text-xs font-semibold text-[#7A5A2E]">수정 사유</span>
            <textarea
              value={revisionReason}
              onChange={(event) => setRevisionReason(event.target.value)}
              rows={3}
              placeholder="어떤 부분을 어떻게 다시 작업해야 하는지 적어주세요."
              className="mt-1 w-full resize-y rounded-card border border-border bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-primary"
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={submitRevisionRequest}
              disabled={pendingDecision !== null}
              className="inline-flex h-9 items-center gap-1.5 rounded-button bg-primary px-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RotateCcw size={16} aria-hidden="true" />
              수정요청 확정
            </button>
            <button
              type="button"
              onClick={cancelRevisionForm}
              disabled={pendingDecision !== null}
              className="inline-flex h-9 items-center rounded-button border border-border bg-white px-3 text-sm font-semibold text-[#1F2723] transition hover:bg-surfaceAlt disabled:cursor-not-allowed disabled:opacity-60"
            >
              취소
            </button>
          </div>
        </section>
      ) : null}

      {revisionCandidate ? (
        <section className="mt-4 rounded-card border border-primary/30 bg-surfaceAlt p-3">
          <p className="text-sm font-semibold text-primary">재작업 후보가 생성되었습니다.</p>
          <p className="mt-2 text-sm font-semibold text-[#1F2723]">{revisionCandidate.title}</p>
          <p className="mt-1 text-xs leading-5 text-[#5F6B64]">{revisionCandidate.summary}</p>
        </section>
      ) : null}

      {error ? (
        <p role="alert" className="mt-3 rounded-button border border-danger/30 bg-red-50 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </article>
  );
}

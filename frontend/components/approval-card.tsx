"use client";

import { Check, RotateCcw, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { decideApproval, type ApprovalDecision } from "@/lib/api";
import type { Approval, ApprovalStatus } from "@/lib/types";

interface ApprovalCardProps {
  approval: Approval;
  highlighted?: boolean;
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

export function ApprovalCard({ approval, highlighted = false }: ApprovalCardProps) {
  const router = useRouter();
  const cardRef = useRef<HTMLElement | null>(null);
  const [pendingDecision, setPendingDecision] = useState<ApprovalDecision | null>(null);
  const [decidedStatus, setDecidedStatus] = useState<ApprovalDecision | null>(null);
  const [isRevisionFormOpen, setIsRevisionFormOpen] = useState(false);
  const [revisionReason, setRevisionReason] = useState("");
  const [revisionCandidate, setRevisionCandidate] = useState(approval.revision_candidate_task ?? null);
  const [error, setError] = useState("");
  const currentStatus = decidedStatus ?? approval.status;
  const canDecide = approval.status === "pending_approval" && decidedStatus === null;

  useEffect(() => {
    if (!highlighted) {
      return;
    }

    window.setTimeout(() => {
      cardRef.current?.scrollIntoView?.({
        behavior: "smooth",
        block: "center",
      });
    }, 80);
  }, [highlighted]);

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
    <article
      ref={cardRef}
      id={`approval-${approval.id}`}
      aria-current={highlighted ? "true" : undefined}
      className={`rounded-[14px] border p-4 text-white shadow-[0_18px_50px_rgba(0,0,0,0.25)] ${
        highlighted
          ? "border-[#F2B84B]/80 bg-[#181408] shadow-[0_0_0_1px_rgba(242,184,75,0.26),0_20px_70px_rgba(242,184,75,0.12)]"
          : "border-white/10 bg-[#111820]"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-button bg-[#302410] px-2 py-1 text-xs font-semibold text-[#FFD37A]">
              {statusLabels[currentStatus] ?? currentStatus}
            </span>
            <span className="text-xs font-medium text-[#AEB9C4]">{approval.affected_area}</span>
            {highlighted ? (
              <span className="rounded-full bg-[#302410] px-2 py-1 text-xs font-semibold text-[#FFD37A]">
                대시보드 선택
              </span>
            ) : null}
          </div>
          <h2 className="mt-3 text-base font-semibold text-white">{approval.title}</h2>
          <p className="mt-2 text-sm leading-6 text-[#C7D2DC]">{approval.summary}</p>
        </div>

        {canDecide ? (
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleDecision("approved")}
              disabled={pendingDecision !== null}
              className="inline-flex h-9 items-center gap-1.5 rounded-button bg-[#2F7D4E] px-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Check size={16} aria-hidden="true" />
              {decisionLabels.approved}
            </button>
            <button
              type="button"
              onClick={() => handleDecision("rejected")}
              disabled={pendingDecision !== null}
              className="inline-flex h-9 items-center gap-1.5 rounded-button bg-[#B83A3A] px-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <X size={16} aria-hidden="true" />
              {decisionLabels.rejected}
            </button>
            <button
              type="button"
              onClick={openRevisionForm}
              disabled={pendingDecision !== null}
              className="inline-flex h-9 items-center gap-1.5 rounded-button border border-white/10 bg-white/[0.06] px-3 text-sm font-semibold text-[#DDE6EE] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RotateCcw size={16} aria-hidden="true" />
              {decisionLabels.revise_requested}
            </button>
          </div>
        ) : (
          <div className="shrink-0 rounded-button border border-white/10 bg-white/[0.06] px-3 py-2 text-sm font-semibold text-[#AEB9C4]">
            최종 상태: {statusLabels[currentStatus] ?? currentStatus}
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <section className="rounded-[10px] border border-white/10 bg-black/20 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-normal text-[#AEB9C4]">Reviewer Note</h3>
          <p className="mt-2 text-sm leading-6 text-[#E8EEF2]">{approval.reviewer_note || "검토 메모가 없습니다."}</p>
        </section>
        <section className="rounded-[10px] border border-white/10 bg-[#0A111B] p-3 text-white">
          <h3 className="text-xs font-semibold uppercase tracking-normal text-[#CBD5E1]">After Content</h3>
          <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap text-xs leading-5">
            <code>{approval.after_content}</code>
          </pre>
        </section>
      </div>

      {isRevisionFormOpen && canDecide ? (
        <section className="mt-4 rounded-[10px] border border-[#F2B84B]/40 bg-[#241C0F] p-3">
          <label className="block">
            <span className="text-xs font-semibold text-[#FFD37A]">수정 사유</span>
            <textarea
              value={revisionReason}
              onChange={(event) => setRevisionReason(event.target.value)}
              rows={3}
              placeholder="어떤 부분을 어떻게 다시 작업해야 하는지 적어주세요."
              className="mt-1 w-full resize-y rounded-[10px] border border-white/10 bg-[#101820] px-3 py-2 text-sm leading-6 text-white outline-none focus:border-[#38BDF8]"
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={submitRevisionRequest}
              disabled={pendingDecision !== null}
              className="inline-flex h-9 items-center gap-1.5 rounded-button bg-[#FF5261] px-3 text-sm font-semibold text-white transition hover:bg-[#FF6976] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RotateCcw size={16} aria-hidden="true" />
              수정요청 확정
            </button>
            <button
              type="button"
              onClick={cancelRevisionForm}
              disabled={pendingDecision !== null}
              className="inline-flex h-9 items-center rounded-button border border-white/10 bg-white/[0.06] px-3 text-sm font-semibold text-[#DDE6EE] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              취소
            </button>
          </div>
        </section>
      ) : null}

      {revisionCandidate ? (
        <section className="mt-4 rounded-[10px] border border-[#38BDF8]/35 bg-[#0B2535]/45 p-3">
          <p className="text-sm font-semibold text-[#7DD7FF]">재작업 후보가 생성되었습니다.</p>
          <p className="mt-2 text-sm font-semibold text-white">{revisionCandidate.title}</p>
          <p className="mt-1 text-xs leading-5 text-[#AEB9C4]">{revisionCandidate.summary}</p>
        </section>
      ) : null}

      {error ? (
        <p role="alert" className="mt-3 rounded-button border border-[#FF6B7A]/30 bg-[#2A1217] px-3 py-2 text-sm text-[#FF6B7A]">
          {error}
        </p>
      ) : null}
    </article>
  );
}

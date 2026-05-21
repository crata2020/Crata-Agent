"use client";

import { Check, RotateCcw, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { decideApproval, type ApprovalDecision } from "@/lib/api";
import { taskTypeLabel } from "@/lib/task-labels";
import type { Approval, ApprovalComparison, ApprovalStatus } from "@/lib/types";

interface ApprovalCardProps {
  approval: Approval;
  highlighted?: boolean;
  compact?: boolean;
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

const knowledgeReferenceLabels: Record<string, string> = {
  "knowledge/official/personal-behavior-motivation/MASTER.md": "개인행동 동기검사 MASTER",
  "knowledge/official/group-behavior/MASTER.md": "집단행동검사 MASTER",
  "knowledge/agent-guides/agent-operating-guides.md": "에이전트 작업 가이드",
};

function knowledgeReferenceLabel(reference: string) {
  return knowledgeReferenceLabels[reference] ?? reference;
}

export function ApprovalCard({ approval, highlighted = false, compact = false }: ApprovalCardProps) {
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
  const hasUnansweredQuestions = approval.after_content?.includes("먼저 확인할 질문") || approval.reviewer_note?.includes("먼저 확인할 질문");

  useEffect(() => {
    if (!highlighted) return;
    window.setTimeout(() => {
      cardRef.current?.scrollIntoView?.({ behavior: "smooth", block: "center" });
    }, 80);
  }, [highlighted]);

  async function handleDecision(decision: ApprovalDecision, reason = "") {
    if (!canDecide || pendingDecision !== null) return;
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
      className={`space-y-3 rounded-xl border p-4 text-white transition ${
        highlighted
          ? "border-[var(--color-warning)]/60 bg-[#241C0F]"
          : "border-[var(--color-border)] bg-[var(--color-surface)]"
      }`}
    >
      {/* Header: title + status */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#3A2A12] px-2.5 py-0.5 text-[10px] font-bold text-[#FFD37A]">
            {statusLabels[currentStatus] ?? currentStatus}
          </span>
          <span className="text-[11px] font-semibold text-[var(--color-text-muted)]">{taskTypeLabel(approval.affected_area)}</span>
        </div>
        <h2 className="mt-2 text-base font-bold leading-6 text-white">{approval.title}</h2>
        <p className="mt-1 text-sm leading-6 text-[var(--color-text-secondary)]">{approval.summary}</p>
      </div>

      {/* 작업 내용 - 에이전트가 뭘 했는지 */}
      <div className="rounded-xl border border-[var(--color-border)] bg-black/20">
        <TaskContextPanel taskId={approval.task_id} />
        
        {/* 검토 메모 (에이전트의 판단 근거) */}
        {approval.reviewer_note && (
          <div className="border-b border-[var(--color-border)] p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">검토 메모 (Reviewer Note)</p>
            <p className="mt-1.5 text-sm leading-6 text-[#DDE6EE]">{approval.reviewer_note}</p>
          </div>
        )}

        {/* 변경 내역 하이라이트 (Diff) 또는 단일 결과 */}
        <div className="p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-accent)]">
            {approval.before_content ? "변경 사항 하이라이트 (Diff)" : "작업 결과"}
          </p>
          {approval.before_content ? (
            <DiffViewer before={approval.before_content} after={approval.after_content} />
          ) : (
            <FormattedContent content={approval.after_content} />
          )}
        </div>
      </div>

      {/* 참조 근거 */}
      {approval.knowledge_references?.length ? (
        <div className="rounded-xl border border-[var(--color-info)]/20 bg-[var(--color-info-soft)] p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-info)]">참조 근거</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {approval.knowledge_references.map((ref) => (
              <Link
                key={ref}
                href={`/memory?query=${encodeURIComponent(knowledgeReferenceLabel(ref))}`}
                className="rounded-lg border border-[var(--color-info)]/25 bg-black/20 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-black/30"
              >
                {knowledgeReferenceLabel(ref)}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {/* Links */}
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/activity?taskId=${encodeURIComponent(approval.task_id)}`}
          className="rounded-lg border border-[var(--color-border)] bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-[var(--color-text-secondary)] hover:bg-white/[0.08]"
        >
          실행 흐름 보기
        </Link>
        <Link
          href={`/map?taskId=${encodeURIComponent(approval.task_id)}`}
          className="rounded-lg border border-[var(--color-info)]/25 bg-[var(--color-info-soft)] px-3 py-1.5 text-[11px] font-semibold text-[var(--color-info)] hover:bg-[rgba(127,183,255,0.14)]"
        >
          운영 맵 보기
        </Link>
      </div>

      {/* Decision buttons */}
      {canDecide ? (
        <div className="space-y-3">
          {hasUnansweredQuestions && (
            <div className="flex items-center gap-2 rounded-lg bg-[var(--color-warning)]/20 px-3 py-2 text-[11px] font-bold text-[var(--color-warning)]">
              <span className="flex size-4 items-center justify-center rounded-full bg-[var(--color-warning)] text-black">!</span>
              에이전트가 작업을 완료하지 못하고 질문을 남겼습니다. [답변하기]를 통해 내용을 전달해 주세요.
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleDecision("approved")}
              disabled={pendingDecision !== null || hasUnansweredQuestions}
              className="flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[#1E5F3D] text-xs font-bold text-white hover:bg-[#26734B] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check size={14} />
              승인
            </button>
            <button
              type="button"
              onClick={() => handleDecision("rejected")}
              disabled={pendingDecision !== null}
              className="flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[#8C2D35] text-xs font-bold text-white hover:bg-[#A33740] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X size={14} />
              거절 / 삭제
            </button>
            <button
              type="button"
              onClick={() => { setIsRevisionFormOpen(true); setError(""); }}
              disabled={pendingDecision !== null}
              className={`flex h-9 items-center justify-center gap-1.5 rounded-xl border text-xs font-bold disabled:opacity-50 transition ${hasUnansweredQuestions ? "border-[var(--color-warning)] bg-[var(--color-warning)]/10 text-[var(--color-warning)] hover:bg-[var(--color-warning)]/20" : "border-[var(--color-border)] bg-white/[0.04] text-[var(--color-text-secondary)] hover:bg-white/[0.08]"}`}
            >
              <RotateCcw size={14} />
              {hasUnansweredQuestions ? "답변하기" : "수정요청"}
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--color-border)] bg-white/[0.03] px-3 py-2 text-xs font-semibold text-[var(--color-text-muted)]">
          최종 상태: {statusLabels[currentStatus] ?? currentStatus}
        </div>
      )}

      {/* Revision form */}
      {isRevisionFormOpen && canDecide && (
        <div className="rounded-xl border border-[var(--color-warning)]/40 bg-[#241C0F] p-4">
          <label className="block">
            <span className="text-xs font-bold text-[var(--color-warning)]">
              {hasUnansweredQuestions ? "에이전트 질문에 대한 답변" : "수정 사유"}
            </span>
            <textarea
              value={revisionReason}
              onChange={(e) => setRevisionReason(e.target.value)}
              rows={3}
              placeholder={hasUnansweredQuestions ? "질문에 대한 답변을 남겨주시면 에이전트가 이어서 작업을 진행합니다." : "어떤 부분을 어떻게 다시 작업해야 하는지 적어주세요."}
              className="mt-2 w-full resize-y rounded-xl border border-[var(--color-border)] bg-[#16161A] px-3 py-2.5 text-sm leading-6 text-white outline-none focus:border-[var(--color-accent)]"
            />
          </label>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={submitRevisionRequest}
              disabled={pendingDecision !== null}
              className="flex h-9 items-center gap-1.5 rounded-xl bg-[var(--color-warning)] px-4 text-xs font-bold text-black hover:opacity-90 disabled:opacity-50"
            >
              <RotateCcw size={14} />
              수정요청 확정
            </button>
            <button
              type="button"
              onClick={() => { setIsRevisionFormOpen(false); setRevisionReason(""); setError(""); }}
              className="rounded-xl border border-[var(--color-border)] px-4 text-xs font-semibold text-[var(--color-text-muted)] hover:text-white"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* Revision candidate */}
      {revisionCandidate && (
        <div className="rounded-xl border border-[var(--color-info)]/30 bg-[#0B2535]/45 p-3">
          <p className="text-xs font-bold text-[var(--color-info)]">재작업 후보가 생성되었습니다</p>
          <p className="mt-1 text-sm font-semibold text-white">{revisionCandidate.title}</p>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{revisionCandidate.summary}</p>
          <Link
            href={`/request-intake?candidateId=${encodeURIComponent(revisionCandidate.id)}`}
            className="mt-2 inline-flex rounded-lg border border-[var(--color-info)]/25 bg-[var(--color-info-soft)] px-3 py-1.5 text-[11px] font-bold text-[var(--color-info)] hover:bg-[rgba(127,183,255,0.14)]"
          >
            재작업 후보 열기
          </Link>
        </div>
      )}

      {/* Comparison panel */}
      {approval.comparison && <ComparisonPanel comparison={approval.comparison} currentApprovalId={approval.id} />}

      {/* Error */}
      {error && (
        <p className="rounded-xl border border-[var(--color-danger)]/30 bg-[var(--color-danger-soft)] px-3 py-2 text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}
    </article>
  );
}

function ComparisonPanel({ comparison, currentApprovalId }: { comparison: ApprovalComparison; currentApprovalId: string }) {
  const revisionContent = comparison.revision_after_content?.trim();

  return (
    <div className="rounded-xl border border-[var(--color-warning)]/30 bg-[#241C0F]/50 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-[var(--color-warning)]">원본 vs 재작업 비교</h3>
        <span className="rounded-full bg-[#3A2A12] px-2 py-0.5 text-[10px] font-bold text-[#FFD37A]">
          {revisionContent ? "비교 가능" : "재작업 대기"}
        </span>
      </div>

      {comparison.revision_reason && (
        <p className="rounded-lg border border-[var(--color-warning)]/20 bg-black/25 px-3 py-2 text-xs text-[#E9D6A8]">
          수정요청: {comparison.revision_reason}
        </p>
      )}

      <div className="grid gap-2 md:grid-cols-2">
        <DraftBox label="원본 초안" content={comparison.source_after_content} />
        <DraftBox
          label="재작업 초안"
          content={revisionContent || "재작업 후보를 실행하면 여기에 표시됩니다."}
          muted={!revisionContent}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/approvals?approvalId=${encodeURIComponent(comparison.source_approval_id)}`}
          className="rounded-lg border border-[var(--color-warning)]/25 bg-[#302410] px-3 py-1.5 text-[11px] font-semibold text-[#FFD37A] hover:bg-[#3A2B13]"
        >
          원 승인 보기
        </Link>
        {comparison.revision_approval_id && (
          <Link
            href={`/approvals?approvalId=${encodeURIComponent(comparison.revision_approval_id)}`}
            className="rounded-lg border border-[var(--color-accent)]/25 bg-[var(--color-accent-soft)] px-3 py-1.5 text-[11px] font-semibold text-[var(--color-accent)] hover:bg-[rgba(79,209,165,0.14)]"
          >
            재작업 승인 보기
          </Link>
        )}
      </div>
    </div>
  );
}

function DraftBox({ label, content, muted = false }: { label: string; content: string; muted?: boolean }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-black/20 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">{label}</p>
      <FormattedContent content={content} muted={muted} />
    </div>
  );
}

function FormattedContent({ content, muted = false }: { content: string; muted?: boolean }) {
  // Pre-process: insert line breaks before markdown patterns that appear mid-line
  const preprocessed = content
    .replace(/\s(?=#{1,3}\s)/g, "\n")       // break before # ## ###
    .replace(/\s(?=---)/g, "\n")             // break before ---
    .replace(/\s(?=- [^\s])/g, "\n")         // break before - list items
    .replace(/([.。!?])\s+(?=[가-힣A-Z])/g, "$1\n") // break after sentence ends before Korean/uppercase
    .replace(/(?:작업 유형:|배정 에이전트:|설명:|source:|status:|updated_at:|exam:|knowledge_type:)/g, "\n$&") // break before key: patterns
    .replace(/\n{3,}/g, "\n\n");             // collapse excessive breaks

  const lines = preprocessed.split("\n");
  const textColor = muted ? "text-[#8A929B]" : "text-[var(--color-text-secondary)]";
  const headingColor = muted ? "text-[#A0A8B0]" : "text-white";

  const elements: React.ReactNode[] = [];
  let listBuffer: string[] = [];
  let idx = 0;

  function flushList() {
    if (listBuffer.length === 0) return;
    elements.push(
      <ul key={`list-${idx}`} className={`mt-1.5 space-y-1 pl-4 ${textColor}`}>
        {listBuffer.map((item, i) => (
          <li key={i} className="list-disc text-[13px] leading-5">{item}</li>
        ))}
      </ul>
    );
    listBuffer = [];
    idx++;
  }

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      continue;
    }

    // Horizontal rule
    if (/^-{3,}$/.test(trimmed)) {
      flushList();
      elements.push(<hr key={`hr-${idx++}`} className="my-2 border-[var(--color-border)]" />);
      continue;
    }

    // Headings
    if (trimmed.startsWith("## ")) {
      flushList();
      elements.push(
        <p key={`h2-${idx++}`} className={`mt-3 text-[13px] font-bold ${headingColor}`}>
          {trimmed.slice(3)}
        </p>
      );
      continue;
    }
    if (trimmed.startsWith("# ")) {
      flushList();
      elements.push(
        <p key={`h1-${idx++}`} className={`mt-3 text-sm font-bold ${headingColor}`}>
          {trimmed.slice(2)}
        </p>
      );
      continue;
    }

    // List item
    if (trimmed.startsWith("- ")) {
      listBuffer.push(trimmed.slice(2));
      continue;
    }

    // Numbered list (1. 2. 3.)
    if (/^\d+\.\s/.test(trimmed)) {
      flushList();
      elements.push(
        <p key={`ol-${idx++}`} className={`mt-1 text-[13px] leading-6 ${textColor}`}>
          {trimmed}
        </p>
      );
      continue;
    }

    // Key: value pattern (make key bold)
    const kvMatch = trimmed.match(/^([가-힣a-zA-Z_]+\s*[:：])\s*(.+)$/);
    if (kvMatch) {
      flushList();
      elements.push(
        <p key={`kv-${idx++}`} className={`mt-1 text-[13px] leading-6 ${textColor}`}>
          <span className={`font-semibold ${headingColor}`}>{kvMatch[1]}</span> {kvMatch[2]}
        </p>
      );
      continue;
    }

    // Normal text
    flushList();
    elements.push(
      <p key={`p-${idx++}`} className={`mt-1.5 text-[13px] leading-6 ${textColor}`}>
        {trimmed}
      </p>
    );
  }

  flushList();

  return <div className="mt-1.5 max-h-[400px] overflow-y-auto">{elements}</div>;
}

function TaskContextPanel({ taskId }: { taskId: string }) {
  const [context, setContext] = useState<{ original: string } | null>(null);
  
  useEffect(() => {
    async function load() {
      try {
        const { getRequestMap } = await import("@/lib/api");
        const res = await getRequestMap({ taskId });
        if (res.items.length > 0) {
          const item = res.items[0];
          setContext({
            original: item.raw_preview || item.title
          });
        }
      } catch (e) {}
    }
    load();
  }, [taskId]);

  if (!context) return null;

  return (
    <div className="border-b border-[var(--color-border)] p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-info)]">원본 요청 요약 (Context)</p>
      <p className="mt-1.5 text-xs text-[var(--color-text-secondary)] whitespace-pre-wrap rounded-lg bg-black/30 p-2 leading-relaxed">{context.original}</p>
    </div>
  );
}

function DiffViewer({ before, after }: { before: string; after: string }) {
  const [diffs, setDiffs] = useState<any[]>([]);
  
  useEffect(() => {
    async function load() {
      try {
        const { diffWordsWithSpace } = await import("diff");
        setDiffs(diffWordsWithSpace(before, after));
      } catch (e) {
        // fallback to standard display if diff fails
        setDiffs([{ value: after }]);
      }
    }
    load();
  }, [before, after]);

  if (!diffs.length) return null;

  return (
    <div className="mt-1.5 whitespace-pre-wrap text-[13px] leading-6 max-h-[400px] overflow-y-auto bg-[#111114] p-3 rounded-lg border border-white/5">
      {diffs.map((part, i) => {
        if (part.added) {
          return <span key={i} className="bg-[var(--color-accent)]/20 text-[var(--color-accent)] font-medium px-0.5 rounded-[2px]">{part.value}</span>;
        }
        if (part.removed) {
          return <span key={i} className="bg-[var(--color-danger)]/20 text-[var(--color-danger)] line-through opacity-70 px-0.5 rounded-[2px]">{part.value}</span>;
        }
        return <span key={i} className="text-[#AAB0B8]">{part.value}</span>;
      })}
    </div>
  );
}


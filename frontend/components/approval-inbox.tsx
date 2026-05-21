"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import type { Approval, ApprovalStatus } from "@/lib/types";

type ApprovalInboxProps = {
  approvals: Approval[];
  highlightedApprovalId?: string;
};

type StatusFilter = "all" | "pending" | "approved" | "revise_requested" | "rejected";

const statusFilters: Array<{ label: string; value: StatusFilter }> = [
  { label: "전체", value: "all" },
  { label: "승인대기", value: "pending" },
  { label: "승인됨", value: "approved" },
  { label: "수정요청", value: "revise_requested" },
  { label: "거절됨", value: "rejected" },
];

const approvalTypeLabels: Record<string, string> = {
  report_phrase_change: "결과지 문구",
  learning_candidate: "학습 후보",
  general_review: "일반 검토",
};

export function ApprovalInbox({ approvals, highlightedApprovalId }: ApprovalInboxProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedApprovalId, setSelectedApprovalId] = useState(highlightedApprovalId ?? approvals[0]?.id ?? "");

  const counts = useMemo(
    () => ({
      all: approvals.length,
      pending: approvals.filter((approval) => isPendingApproval(approval.status)).length,
      approved: approvals.filter((approval) => approval.status === "approved").length,
      revise_requested: approvals.filter((approval) => approval.status === "revise_requested").length,
      rejected: approvals.filter((approval) => approval.status === "rejected").length,
    }),
    [approvals],
  );

  const visibleApprovals = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return approvals.filter((approval) => {
      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "pending"
            ? isPendingApproval(approval.status)
            : approval.status === statusFilter;
      const haystack = [
        approval.title,
        approval.summary,
        approval.approval_type,
        approval.affected_area,
        approval.reviewer_note,
        approval.after_content,
      ]
        .join(" ")
        .toLowerCase();
      const matchesQuery = normalizedQuery.length === 0 || haystack.includes(normalizedQuery);

      return matchesStatus && matchesQuery;
    });
  }, [approvals, query, statusFilter]);

  const selectedApproval =
    visibleApprovals.find((approval) => approval.id === selectedApprovalId) ??
    visibleApprovals[0] ??
    null;

  useEffect(() => {
    if (highlightedApprovalId) {
      setSelectedApprovalId(highlightedApprovalId);
      return;
    }

    if (visibleApprovals.length > 0 && !visibleApprovals.some((approval) => approval.id === selectedApprovalId)) {
      setSelectedApprovalId(visibleApprovals[0].id);
    }
  }, [highlightedApprovalId, selectedApprovalId, visibleApprovals]);

  if (approvals.length === 0) {
    return (
      <section className="mt-4 rounded-card border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4 text-sm text-[var(--color-text-secondary)]">
        승인대기 항목이 없습니다.
      </section>
    );
  }

  const columns = [
    {
      key: "pending",
      title: "승인 대기",
      tone: "#F2B84B",
      items: visibleApprovals.filter((approval) => isPendingApproval(approval.status)),
    },
    {
      key: "approved",
      title: "승인됨",
      tone: "#36D47F",
      items: visibleApprovals.filter((approval) => approval.status === "approved"),
    },
    {
      key: "revise_requested",
      title: "수정요청",
      tone: "#38BDF8",
      items: visibleApprovals.filter((approval) => approval.status === "revise_requested"),
    },
    {
      key: "rejected",
      title: "거절됨",
      tone: "#FF5F6D",
      items: visibleApprovals.filter((approval) => approval.status === "rejected"),
    },
  ];
  const populatedColumns = columns.filter((column) => column.items.length > 0);

  return (
    <section className="flex min-h-0 flex-1 flex-col" aria-label="승인 항목">
      <div className="flex shrink-0 flex-col gap-3 border-b border-white/10 px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {statusFilters.map((filter) => {
            const isActive = statusFilter === filter.value;
            const count = counts[filter.value];

            return (
              <button
                key={filter.value}
                type="button"
                aria-label={`${filter.label} ${count}`}
                aria-pressed={isActive}
                onClick={() => setStatusFilter(filter.value)}
                className={`inline-flex h-8 items-center gap-2 rounded-button px-3 text-xs font-medium transition ${
                  isActive
                    ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                    : "bg-white/[0.04] text-[var(--color-text-secondary)] hover:bg-white/[0.07] hover:text-white"
                }`}
              >
                <span className="sr-only">{filter.label} {count}개</span>
                <span>{filter.label}</span>
                <span aria-hidden="true" className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px]">{count}개</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <p className="rounded-button border border-[var(--color-border)] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)]">
            표시 중 {visibleApprovals.length}개 / 전체 {approvals.length}개
          </p>
          <label className="block min-w-[260px]">
            <span className="sr-only">승인 항목 검색</span>
            <input
              aria-label="승인 항목 검색"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="제목, 작업 유형, 검토 메모로 검색"
              className="h-8 w-full rounded-button border border-[var(--color-border)] bg-white/[0.04] px-3 text-xs font-medium text-white outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]"
            />
          </label>
        </div>
      </div>

      {visibleApprovals.length > 0 ? (
        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 xl:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]">
          <div className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black text-white">검토 큐</h2>
                <p className="mt-1 text-xs text-[#858D96]">상태별 빈 칸은 숨기고, 실제 검토할 항목만 보여줍니다.</p>
              </div>
              <span className="rounded-full bg-white/[0.07] px-2 py-1 text-[11px] font-bold text-[#AEB9C4]">
                {visibleApprovals.length}개
              </span>
            </div>

            <div className="space-y-3">
              {populatedColumns.map((column) => (
              <section
                key={column.key}
                className="rounded-[10px] border border-white/10 bg-[#111114]"
              >
                <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-[#202024] px-3 py-2">
                  <h2 className="text-xs font-bold text-[#ECECF0]">{column.title}</h2>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold text-black"
                    style={{ backgroundColor: column.tone }}
                  >
                    {column.items.length}
                  </span>
                </div>
                <div className="space-y-2 p-2">
                  {column.items.map((approval, index) => (
                    <ApprovalMiniCard
                      key={approval.id}
                      approval={approval}
                      index={index}
                      selected={approval.id === selectedApproval?.id}
                      highlighted={approval.id === highlightedApprovalId}
                      onSelect={() => setSelectedApprovalId(approval.id)}
                    />
                  ))}
                </div>
              </section>
              ))}
            </div>
          </div>

          <aside className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 xl:sticky xl:top-0 xl:max-h-[calc(100vh-8rem)] xl:self-start xl:overflow-y-auto">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8EA0AE]">승인 인스펙터</p>
                <p className="mt-1 text-xs text-[#77777F]">선택한 항목만 자세히 검토합니다.</p>
              </div>
              <span className="rounded-full bg-white/[0.06] px-2 py-1 text-[10px] font-bold text-[#AEB9C4]">
                {selectedApproval ? approvalTypeLabels[selectedApproval.approval_type] ?? selectedApproval.approval_type : "대기"}
              </span>
            </div>

            {selectedApproval ? (
              <div className="space-y-4 p-4 bg-black/20 rounded-xl border border-white/5">
                <div>
                  <h3 className="text-sm font-bold text-white leading-snug">{selectedApproval.title}</h3>
                  <p className="mt-2 text-xs text-[var(--color-text-secondary)] leading-relaxed">
                    {selectedApproval.summary || "문서 내용에 대한 요약이 없습니다."}
                  </p>
                </div>
                
                <div className="border-t border-white/5 pt-3 space-y-2">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[var(--color-text-muted)]">결재 유형</span>
                    <span className="font-semibold text-white">{approvalTypeLabels[selectedApproval.approval_type] ?? selectedApproval.approval_type}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[var(--color-text-muted)]">영향 범위</span>
                    <span className="font-semibold text-white">{selectedApproval.affected_area || "전체"}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[var(--color-text-muted)]">현재 상태</span>
                    <span className="font-bold text-[var(--color-accent)]">{approvalStatusLabel(selectedApproval.status)}</span>
                  </div>
                </div>

                <div className="border-t border-white/5 pt-4">
                  <Link
                    href={`/request-intake?candidateId=${selectedApproval.task_id}`}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-black py-3 text-xs font-bold transition shadow-md"
                  >
                    💬 에이전트 채팅 워크스페이스로 이동
                  </Link>
                  <p className="mt-2.5 text-[10px] text-center text-[var(--color-text-muted)] leading-relaxed">
                    이 문서의 상세 검수, 피드백 전송, 반려 및 최종 승인은 에이전트 대화방에서 진행됩니다.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex h-48 items-center justify-center rounded-[10px] border border-dashed border-white/10 text-xs font-semibold text-[#66666E]">
                검토할 항목을 선택하세요.
              </div>
            )}
          </aside>
        </div>
      ) : (
        <section className="m-4 rounded-[12px] border border-white/10 bg-[#1F1D20] p-4">
          <p className="text-sm font-semibold text-white">조건에 맞는 승인 항목이 없습니다.</p>
          <p className="mt-2 text-sm text-[#AEB9C4]">검색어나 상태 필터를 조정하세요.</p>
        </section>
      )}
    </section>
  );
}

function ApprovalMiniCard({
  approval,
  index,
  selected,
  highlighted,
  onSelect,
}: {
  approval: Approval;
  index: number;
  selected: boolean;
  highlighted: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      onPointerDown={onSelect}
      aria-pressed={selected}
      aria-label={`${approval.title} 선택`}
      className={`w-full rounded-[8px] border px-3 py-2.5 text-left transition ${
        selected
          ? "border-[#38BDF8] bg-[#0B2535]/70 shadow-[0_0_0_1px_rgba(56,189,248,0.22)]"
          : highlighted
            ? "border-[#F2B84B]/70 bg-[#241C0F]/80"
            : "border-white/10 bg-[#202024] hover:border-white/20 hover:bg-[#252529]"
      }`}
      style={{ borderLeftColor: highlighted ? "#F2B84B" : selected ? "#38BDF8" : "#7C3AED", borderLeftWidth: 3 }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-black text-[#77777F]">항목 {index + 1}</span>
        <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold text-[#AEB9C4]">
          {approvalStatusLabel(approval.status)}
        </span>
      </div>
      <p className="mt-2 line-clamp-1 text-[13px] font-bold leading-5 text-white">{approval.title}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="rounded-[5px] bg-black/25 px-2 py-0.5 text-[10px] font-bold text-[#AEB9C4]">
          {approvalTypeLabels[approval.approval_type] ?? approval.approval_type}
        </span>
        {approval.knowledge_references?.length ? (
          <span className="rounded-[5px] bg-[#092234] px-2 py-0.5 text-[10px] font-bold text-[#7DD7FF]">
            근거 {approval.knowledge_references.length}
          </span>
        ) : null}
      </div>
    </button>
  );
}

function approvalStatusLabel(status: ApprovalStatus) {
  switch (status) {
    case "pending_approval":
    case "waiting_for_approval":
      return "승인대기";
    case "approved":
      return "승인됨";
    case "revise_requested":
      return "수정요청";
    case "rejected":
      return "거절됨";
    default:
      return status;
  }
}

function isPendingApproval(status: ApprovalStatus) {
  return status === "pending_approval" || status === "waiting_for_approval";
}

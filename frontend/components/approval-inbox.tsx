"use client";

import { useMemo, useState } from "react";

import { ApprovalCard } from "@/components/approval-card";
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

export function ApprovalInbox({ approvals, highlightedApprovalId }: ApprovalInboxProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

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

  if (approvals.length === 0) {
    return (
      <section className="mt-5 rounded-[14px] border border-white/10 bg-[#111820] p-6 text-sm text-[#AEB9C4]">
        승인대기 항목이 없습니다.
      </section>
    );
  }

  return (
    <section className="mt-5 space-y-4" aria-label="승인 항목">
      <div className="rounded-[14px] border border-white/10 bg-[#111820]/88 p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <label className="block min-w-0 flex-1">
            <span className="text-xs font-semibold text-[#AEB9C4]">승인 항목 검색</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="제목, 작업 유형, 검토 메모로 검색"
              className="mt-2 h-11 w-full rounded-[10px] border border-white/10 bg-black/24 px-3 text-sm text-white outline-none transition placeholder:text-[#687481] focus:border-[#38BDF8]"
            />
          </label>

          <p className="text-sm font-semibold text-[#DDE6EE]">
            표시 중 {visibleApprovals.length}개 / 전체 {approvals.length}개
          </p>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
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
                className={`h-10 rounded-button border px-3 text-sm font-semibold transition ${
                  isActive
                    ? "border-[#F2B84B]/60 bg-[#302410] text-[#FFD37A]"
                    : "border-white/10 bg-white/[0.06] text-[#C7D2DC] hover:bg-white/10"
                }`}
              >
                {filter.label}
                <span className="ml-2 text-xs opacity-75">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-4">
          <QueueStat label="전체" value={`${counts.all}개`} />
          <QueueStat label="승인대기" value={`${counts.pending}개`} />
          <QueueStat label="승인됨" value={`${counts.approved}개`} />
          <QueueStat label="수정요청" value={`${counts.revise_requested}개`} />
        </div>
      </div>

      {visibleApprovals.length > 0 ? (
        <div className="space-y-3">
          {visibleApprovals.map((approval) => (
            <ApprovalCard
              key={approval.id}
              approval={approval}
              highlighted={approval.id === highlightedApprovalId}
            />
          ))}
        </div>
      ) : (
        <section className="rounded-[14px] border border-white/10 bg-[#111820] p-6">
          <p className="text-sm font-semibold text-white">조건에 맞는 승인 항목이 없습니다.</p>
          <p className="mt-2 text-sm text-[#AEB9C4]">검색어나 상태 필터를 조정하세요.</p>
        </section>
      )}
    </section>
  );
}

function isPendingApproval(status: ApprovalStatus) {
  return status === "pending_approval" || status === "waiting_for_approval";
}

function QueueStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] border border-white/10 bg-black/18 px-3 py-2">
      <p className="text-sm font-semibold text-white">{label} {value}</p>
    </div>
  );
}

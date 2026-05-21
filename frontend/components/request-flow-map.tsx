"use client";

import { useMemo, useState } from "react";

import { taskTypeLabel } from "@/lib/task-labels";
import type { DashboardSummary, RequestMapItem, RequestMapTask } from "@/lib/types";

const statusLabels: Record<string, { label: string; cls: string }> = {
  draft: { label: "대기", cls: "bg-white/[0.06] text-[#B0BAC5]" },
  running: { label: "실행 중", cls: "bg-[#0F2A1A] text-[#6FF0A0]" },
  pending_approval: { label: "승인 대기", cls: "bg-[#2A2010] text-[#FFD37A]" },
  approved: { label: "승인됨", cls: "bg-[#0F2A1A] text-[#6FF0A0]" },
  rejected: { label: "반려", cls: "bg-[#2A1218] text-[#FF6B7A]" },
  revise_requested: { label: "수정요청", cls: "bg-[#2A2010] text-[#FFD37A]" },
  failed: { label: "실패", cls: "bg-[#2A1218] text-[#FF6B7A]" },
};

const stepLabels: Record<string, string> = {
  ceo_routing: "CEO 라우팅",
  context_retrieval: "근거 확인",
  question_gate: "질문 확인",
  specialist_draft: "초안 작성",
  quality_review: "품질 검수",
  approval_pending: "승인 대기",
};

type Props = {
  items: RequestMapItem[];
  summary: DashboardSummary;
  selectedRequestId?: string;
  focusTaskId?: string;
  focusCandidateId?: string;
  focusAgentId?: string;
};

export function RequestFlowMap({ items, summary, focusTaskId }: Props) {
  const [selReqId, setSelReqId] = useState<string | null>(() => {
    if (focusTaskId) {
      const found = items.find((i) => i.candidates.some((c) => c.task_id === focusTaskId));
      return found?.id ?? items[0]?.id ?? null;
    }
    return items[0]?.id ?? null;
  });
  const [selTaskId, setSelTaskId] = useState<string | null>(focusTaskId ?? null);

  const selReq = items.find((i) => i.id === selReqId) ?? null;
  const selTask = selReq?.candidates.find((c) => c.task_id === selTaskId || c.id === selTaskId) ?? null;

  const stats = useMemo(() => {
    const all = items.flatMap((i) => i.candidates);
    return {
      total: all.length,
      running: all.filter((c) => c.status === "running").length,
      approval: all.filter((c) => c.status === "pending_approval" || c.approval_id).length,
      done: all.filter((c) => c.status === "approved").length,
    };
  }, [items]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">운영 맵</h1>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              요청이 어떤 작업으로 나뉘었고, 각 작업이 어느 단계에 있는지 봅니다.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold">
            <StatChip label="전체" value={stats.total} color="#B0BAC5" />
            <StatChip label="실행 중" value={stats.running} color="#6FF0A0" />
            <StatChip label="승인 대기" value={stats.approval} color="#FFD37A" />
            <StatChip label="완료" value={stats.done} color="#7FB7FF" />
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Request list - left sidebar */}
        <div className="w-[260px] shrink-0 overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3">
          <p className="mb-3 text-[11px] font-bold text-[var(--color-text-muted)]">요청 {items.length}개</p>
          <div className="space-y-2">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSelReqId(item.id);
                  setSelTaskId(null);
                }}
                className={`w-full rounded-xl border p-3 text-left transition ${
                  selReqId === item.id
                    ? "border-[var(--color-accent)]/50 bg-[var(--color-accent-soft)]"
                    : "border-[var(--color-border)] bg-black/15 hover:bg-white/[0.04]"
                }`}
              >
                <p className="line-clamp-1 text-sm font-semibold text-white">{item.title}</p>
                <p className="mt-1 line-clamp-1 text-[11px] text-[var(--color-text-muted)]">{item.raw_preview}</p>
                <div className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold">
                  <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[var(--color-text-secondary)]">
                    {item.candidates.length} 작업
                  </span>
                  {item.candidates.some((c) => c.approval_id) && (
                    <span className="rounded-full bg-[#2A2010] px-2 py-0.5 text-[#FFD37A]">승인</span>
                  )}
                </div>
              </button>
            ))}
            {items.length === 0 && (
              <div className="rounded-xl border border-dashed border-[var(--color-border)] py-8 text-center">
                <p className="text-2xl opacity-20">📋</p>
                <p className="mt-2 text-xs text-[var(--color-text-muted)]">요청이 없습니다.</p>
              </div>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="min-w-0 flex-1 overflow-y-auto p-5">
          {selReq ? (
            <div className="mx-auto max-w-4xl">
              {/* Request header */}
              <div className="mb-5">
                <h2 className="text-lg font-bold text-white">{selReq.title}</h2>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{selReq.raw_preview}</p>
              </div>

              {/* Task cards */}
              <div className="space-y-3">
                {selReq.candidates.map((task, i) => {
                  const status = statusLabels[task.status] ?? statusLabels.draft;
                  const selected = selTaskId === task.task_id || selTaskId === task.id;

                  return (
                    <div key={task.id}>
                      <button
                        type="button"
                        onClick={() => setSelTaskId(selected ? null : (task.task_id ?? task.id))}
                        className={`w-full rounded-xl border p-4 text-left transition ${
                          selected
                            ? "border-[var(--color-accent)]/50 bg-[var(--color-surface)] shadow-lg"
                            : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-accent)]/30"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Number */}
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-accent-soft)] text-xs font-bold text-[var(--color-accent)]">
                            {i + 1}
                          </span>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-white">{task.title}</h3>
                              <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-text-muted)]">
                                {taskTypeLabel(task.task_type)}
                              </span>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${status.cls}`}>
                                {status.label}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{task.summary}</p>

                            {/* Progress bar */}
                            <div className="mt-3 flex items-center gap-2">
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                                <div
                                  className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-500"
                                  style={{
                                    width: task.total_steps > 0
                                      ? `${Math.max((task.current_step_index / task.total_steps) * 100, 8)}%`
                                      : "0%",
                                  }}
                                />
                              </div>
                              <span className="shrink-0 text-[10px] font-semibold text-[var(--color-text-muted)]">
                                {task.current_step_index}/{task.total_steps}
                              </span>
                            </div>

                            {/* Agents */}
                            {task.agents.length > 0 && (
                              <div className="mt-2.5 flex flex-wrap gap-1.5">
                                {task.agents.map((agent) => (
                                  <span
                                    key={agent.id}
                                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                                    style={{
                                      color: agent.color,
                                      backgroundColor: `${agent.color}14`,
                                      border: `1px solid ${agent.color}28`,
                                    }}
                                  >
                                    <span className="size-1.5 rounded-full" style={{ backgroundColor: agent.color }} />
                                    {agent.display_name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Expand indicator */}
                          <span className={`mt-1 text-sm text-[var(--color-text-muted)] transition ${selected ? "rotate-90" : ""}`}>
                            ▸
                          </span>
                        </div>
                      </button>

                      {/* Expanded step detail */}
                      {selected && task.steps.length > 0 && (
                        <div className="ml-10 mt-1 space-y-1 rounded-b-xl border border-t-0 border-[var(--color-border)] bg-black/15 p-4 crata-fade-in">
                          <p className="mb-3 text-[11px] font-bold text-[var(--color-text-muted)]">실행 단계</p>
                          {task.steps.map((step, si) => {
                            const isDone = step.status === "completed";
                            const isRunning = step.status === "running";
                            const agentName = task.agents.find((a) => a.id === step.agent_id)?.display_name ?? step.agent_id ?? "시스템";

                            return (
                              <div key={step.id} className="flex items-start gap-3">
                                {/* Step indicator */}
                                <div className="flex flex-col items-center">
                                  <span className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                                    isDone ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                                    : isRunning ? "bg-[#0F2A1A] text-[#6FF0A0] animate-pulse"
                                    : "bg-white/[0.06] text-[var(--color-text-muted)]"
                                  }`}>
                                    {isDone ? "✓" : si + 1}
                                  </span>
                                  {si < task.steps.length - 1 && (
                                    <div className={`w-px flex-1 min-h-[16px] ${isDone ? "bg-[var(--color-accent)]/40" : "bg-white/10"}`} />
                                  )}
                                </div>

                                <div className="min-w-0 flex-1 pb-3">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-white">
                                      {stepLabels[step.step_name] ?? step.step_name}
                                    </span>
                                    <span className="text-[10px] text-[var(--color-text-muted)]">{agentName}</span>
                                  </div>
                                  {step.output_summary && (
                                    <p className="mt-1 text-[11px] leading-4 text-[var(--color-text-secondary)]">
                                      {step.output_summary}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}

                          {/* Quick links */}
                          <div className="flex gap-2 pt-2">
                            {task.approval_id && (
                              <a
                                href={`/approvals?approvalId=${encodeURIComponent(task.approval_id)}`}
                                className="rounded-lg border border-[var(--color-warning)]/25 bg-[var(--color-warning-soft)] px-3 py-1.5 text-[11px] font-semibold text-[var(--color-warning)]"
                              >
                                승인 카드
                              </a>
                            )}
                            {task.activity_href && (
                              <a
                                href={task.activity_href}
                                className="rounded-lg border border-[var(--color-border)] bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-[var(--color-text-secondary)]"
                              >
                                활동 로그
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Decomposition trace */}
              {selReq.decomposition_trace.length > 0 && (
                <details className="mt-5 rounded-xl border border-[var(--color-border)] bg-black/15">
                  <summary className="cursor-pointer px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)] hover:text-white">
                    입력 분해 과정 ({selReq.decomposition_trace.length}단계)
                  </summary>
                  <div className="border-t border-[var(--color-border)] px-4 py-3 space-y-2">
                    {selReq.decomposition_trace.map((node) => (
                      <div key={node.name} className="flex items-start gap-2 text-xs">
                        <span className="mt-0.5 text-[var(--color-accent)]">✓</span>
                        <div>
                          <span className="font-semibold text-white">{node.name}</span>
                          <span className="ml-2 text-[var(--color-text-muted)]">{node.summary}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <span className="text-4xl opacity-20">🗺️</span>
              <p className="mt-3 text-sm text-[var(--color-text-muted)]">왼쪽에서 요청을 선택하세요.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-black/20 px-2.5 py-1.5">
      <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-[var(--color-text-secondary)]">{label}</span>
      <span className="font-bold text-white">{value}</span>
    </span>
  );
}

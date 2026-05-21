"use client";

import {
  AlertCircle,
  CheckCircle2,
  CircleDot,
  PlayCircle,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";


import { getAgentActivity } from "@/lib/api";
import { agentOperatingGuides } from "@/lib/agent-operating-guides";
import { agentSeeds } from "@/lib/agent-seeds";
import { taskTypeLabel } from "@/lib/task-labels";
import type { Agent, AgentActivity, AgentActivityStatus, AgentWorkItem } from "@/lib/types";

const agents: Agent[] = agentSeeds.map((agent) => ({
  ...agent,
  default_model_provider: "local",
  default_model_name: "CRATA local orchestration",
  prompt: "",
}));

const activityStatusLabels: Record<AgentActivityStatus, string> = {
  working: "작업 중",
  waiting_approval: "승인 대기",
  queued: "후보 대기",
  idle: "대기 중",
  planned: "확장 예정",
};

const activityStatusTone: Record<AgentActivityStatus, string> = {
  working: "border-[var(--color-accent)]/25 bg-[var(--color-accent-soft)] text-[var(--color-accent)]",
  waiting_approval: "border-[var(--color-warning)]/25 bg-[var(--color-warning-soft)] text-[var(--color-warning)]",
  queued: "border-[var(--color-info)]/25 bg-[var(--color-info-soft)] text-[var(--color-info)]",
  idle: "border-[var(--color-border)] bg-white/[0.03] text-[var(--color-text-secondary)]",
  planned: "border-[var(--color-border)] bg-white/[0.02] text-[var(--color-text-muted)]",
};

const sourceLabels: Record<string, string> = {
  candidate: "후보",
  task: "작업",
  approval: "승인",
};

export default function AgentsPage() {
  const [selectedAgentId, setSelectedAgentId] = useState("crata_ceo");
  const [activityByAgentId, setActivityByAgentId] = useState<Record<string, AgentActivity>>({});
  const [loadState, setLoadState] = useState<"idle" | "ready" | "error">("idle");
  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId) ?? agents[0];
  const selectedActivity = activityByAgentId[selectedAgent.id];
  const selectedGuide = agentOperatingGuides.find((guide) => guide.agentId === selectedAgent.id);
  const activeCount = agents.filter((agent) => agent.enabled).length;
  const plannedCount = agents.length - activeCount;
  const waitingApprovalCount = Object.values(activityByAgentId).reduce(
    (sum, activity) => sum + activity.pending_approval_count,
    0,
  );
  const workloadCount = Object.values(activityByAgentId).reduce((sum, activity) => sum + activity.workload_count, 0);
  const mergedAgents = useMemo(
    () =>
      agents.map((agent) => ({
        agent,
        activity: activityByAgentId[agent.id],
      })),
    [activityByAgentId],
  );

  useEffect(() => {
    if (process.env.NODE_ENV === "test") {
      return;
    }

    let isCurrent = true;

    getAgentActivity()
      .then((response) => {
        if (!isCurrent) {
          return;
        }
        setActivityByAgentId(Object.fromEntries(response.agents.map((activity) => [activity.id, activity])));
        setLoadState("ready");
      })
      .catch(() => {
        if (isCurrent) {
          setLoadState("error");
        }
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  return (
    <>
      <section className="flex min-h-[calc(100vh-1rem)] flex-col overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-bg)] text-white shadow-panel">
        <header className="flex shrink-0 flex-col gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--color-text-muted)]">에이전트 운영</p>
            <h1 className="mt-1 text-xl font-semibold tracking-[-0.02em] text-white">에이전트 운영실</h1>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              각 직원의 현재 업무, 질문 방식, 산출물 기준을 한 화면에서 관리합니다.
            </p>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <HeaderStat label="전체" value={agents.length} />
            <HeaderStat label="운영" value={activeCount} />
            <HeaderStat label="승인" value={waitingApprovalCount} tone="approval" />
            <HeaderStat label="작업" value={workloadCount} tone="work" />
          </div>
        </header>

        <AgentPulseBar
          activeCount={activeCount}
          plannedCount={plannedCount}
          waitingApprovalCount={waitingApprovalCount}
          workloadCount={workloadCount}
          loadState={loadState}
        />

        <div className="grid flex-1 grid-cols-1 overflow-hidden xl:grid-cols-[312px_minmax(0,1fr)]">
          <main className="min-h-0 overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-white">직원 목록</h2>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  {loadState === "ready"
                    ? "백엔드 작업 큐와 연결된 현재 상태입니다."
                    : loadState === "error"
                      ? "백엔드 상태를 불러오지 못해 기본 직원 구성으로 표시합니다."
                      : "기본 직원 구성입니다. 실행 큐가 연결되면 현재 업무가 표시됩니다."}
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-button border border-[var(--color-border)] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)]">
                <CircleDot size={13} className="text-[#36D47F]" aria-hidden="true" />
                MVP 1차 + 2차 확장 직원
              </div>
            </div>

            <div className="space-y-1.5">
              {mergedAgents.map(({ agent, activity }) => (
                <AgentRosterCard
                  key={agent.id}
                  agent={agent}
                  activity={activity}
                  selected={agent.id === selectedAgentId}
                  onSelect={() => setSelectedAgentId(agent.id)}
                />
              ))}
            </div>
          </main>

          <aside className="min-h-0 overflow-y-auto bg-[var(--color-bg)] p-4">
            <AgentInspector agent={selectedAgent} activity={selectedActivity} guide={selectedGuide} plannedCount={plannedCount} />
          </aside>
        </div>
      </section>
    </>
  );
}

function AgentPulseBar({
  activeCount,
  plannedCount,
  waitingApprovalCount,
  workloadCount,
  loadState,
}: {
  activeCount: number;
  plannedCount: number;
  waitingApprovalCount: number;
  workloadCount: number;
  loadState: "idle" | "ready" | "error";
}) {
  const stateLabel =
    loadState === "ready" ? "백엔드 큐 연결" : loadState === "error" ? "로컬 구성 표시" : "기본 구성 대기";

  return (
    <section className="grid gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-3 md:grid-cols-4">
      <PulseItem label="운영 가능" value={`${activeCount}명`} caption="즉시 배정 가능" tone="accent" />
      <PulseItem label="승인 병목" value={`${waitingApprovalCount}건`} caption="사람 검토 필요" tone="warning" />
      <PulseItem label="작업 부하" value={`${workloadCount}건`} caption="후보·작업·승인 합산" tone="info" />
      <PulseItem label="확장 예정" value={`${plannedCount}명`} caption={stateLabel} tone={loadState === "error" ? "danger" : "muted"} />
    </section>
  );
}

function PulseItem({
  label,
  value,
  caption,
  tone,
}: {
  label: string;
  value: string;
  caption: string;
  tone: "accent" | "warning" | "info" | "danger" | "muted";
}) {
  const toneClass = {
    accent: "border-[var(--color-accent)]/20 text-[var(--color-accent)]",
    warning: "border-[var(--color-warning)]/20 text-[var(--color-warning)]",
    info: "border-[var(--color-info)]/20 text-[var(--color-info)]",
    danger: "border-[var(--color-danger)]/20 text-[var(--color-danger)]",
    muted: "border-[var(--color-border)] text-[var(--color-text-secondary)]",
  }[tone];

  return (
    <div className={`rounded-card border bg-black/20 px-3 py-2 ${toneClass}`}>
      <p className="text-[11px] font-semibold text-[var(--color-text-muted)]">{label}</p>
      <p className="mt-1 text-base font-semibold text-white">{value}</p>
      <p className="mt-0.5 truncate text-[11px] font-medium">{caption}</p>
    </div>
  );
}

function HeaderStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "approval" | "work";
}) {
  const toneClass =
    tone === "approval" ? "text-[var(--color-warning)]" : tone === "work" ? "text-[var(--color-info)]" : "text-white";

  return (
    <div className="min-w-20 rounded-button border border-[var(--color-border)] bg-white/[0.03] px-3 py-2">
      <p className="text-[11px] font-medium text-[var(--color-text-muted)]">{label}</p>
      <p className={`mt-0.5 text-lg font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function AgentRosterCard({
  agent,
  activity,
  selected,
  onSelect,
}: {
  agent: Agent;
  activity?: AgentActivity;
  selected: boolean;
  onSelect: () => void;
}) {
  const status = activity?.activity_status ?? (agent.enabled ? "idle" : "planned");
  const statusLabel = activityStatusLabels[status] ?? status;
  const workTitle = activity?.current_task_title ?? activity?.current_focus ?? (agent.enabled ? "새 요청 대기" : "2차 확장 준비");

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${agent.display_name} 상세 보기`}
      className={`group w-full rounded-card border px-3 py-2.5 text-left transition ${
        selected
          ? "border-[var(--color-accent)]/40 bg-[var(--color-accent-soft)]"
          : "border-[var(--color-border)] bg-white/[0.02] hover:bg-white/[0.04]"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
            <span
              className="flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold"
              style={{ color: agent.color, backgroundColor: `${agent.color}18` }}
            >
              {agent.display_name.slice(0, 1)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-medium text-white">{agent.display_name}</span>
            <span className="mt-0.5 block truncate text-[11px] text-[var(--color-text-muted)]">
              {workTitle}
            </span>
          </span>
        </div>
        <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-medium ${activityStatusTone[status]}`}>
          {statusLabel}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] font-medium text-[var(--color-text-muted)]">
        <span>{activity?.workload_count ?? 0} 작업</span>
        <span>·</span>
        <span>{activity?.candidate_count ?? 0} 후보</span>
        {(activity?.pending_approval_count ?? 0) > 0 ? (
          <>
            <span>·</span>
            <span className="text-[var(--color-warning)]">{activity?.pending_approval_count} 승인대기</span>
          </>
        ) : null}
      </div>
    </button>
  );
}

function AgentInspector({
  agent,
  activity,
  guide,
  plannedCount,
}: {
  agent: Agent;
  activity?: AgentActivity;
  guide?: (typeof agentOperatingGuides)[number];
  plannedCount: number;
}) {
  const status = activity?.activity_status ?? (agent.enabled ? "idle" : "planned");
  const workItems = activity?.work_items ?? [];

  return (
    <div className="space-y-4">
      <section className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-lg text-sm font-semibold"
              style={{ color: agent.color, backgroundColor: `${agent.color}18` }}
            >
              {agent.display_name.slice(0, 1)}
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-white">{agent.display_name}</h2>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">{agent.id}</p>
            </div>
          </div>
          <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-black ${activityStatusTone[status]}`}>
            {activityStatusLabels[status] ?? status}
          </span>
        </div>
        <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">{agent.role}</p>
        <div className="mt-3 rounded-button border border-[var(--color-border)] bg-black/20 p-3">
          <p className="text-[11px] font-medium text-[var(--color-text-muted)]">현재 포커스</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-white">
            {activity?.current_focus ?? (agent.enabled ? "새 요청을 기다리는 중입니다." : `확장 예정 직원입니다. 남은 확장 직원 ${plannedCount}명`)}
          </p>
        </div>
      </section>

      <section className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-[var(--color-text-secondary)]">작업 큐</h3>
          <span className="text-[11px] text-[var(--color-text-muted)]">
            {workItems.length}개
          </span>
        </div>
        <div className="mt-3 space-y-2">
          {workItems.length > 0 ? (
            <>
              {workItems.slice(0, 3).map((item) => <WorkItemRow key={item.id} item={item} />)}
              {workItems.length > 3 ? (
                <div className="rounded-[8px] border border-dashed border-white/10 bg-black/20 px-3 py-2 text-xs font-semibold text-[#858D96]">
                  나머지 {workItems.length - 3}개는 승인함이나 활동 로그에서 확인합니다.
                </div>
              ) : null}
            </>
          ) : (
            <div className="rounded-[8px] border border-dashed border-white/10 bg-black/20 p-3 text-sm leading-6 text-[#858D96]">
              현재 할당된 작업은 없습니다. 새 요청이 들어오면 이 영역에 후보와 승인 항목이 붙습니다.
            </div>
          )}
        </div>
      </section>

      {guide ? (
        <section className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="mb-3 text-[11px] font-medium text-[var(--color-text-muted)]">전문 작업 절차</p>
          <div className="flex items-start gap-2">
            <Workflow size={16} className="mt-0.5 text-[#7DD7FF]" aria-hidden="true" />
            <div>
              <h3 className="text-sm font-black text-white">{guide.title}</h3>
              <p className="mt-1 text-sm leading-6 text-[#C7D2DC]">{guide.summary}</p>
            </div>
          </div>

          <GuideBlock title="먼저 확인할 질문" icon={<AlertCircle size={14} />} items={guide.questionFocus} tone="question" defaultOpen />
          <GuideBlock title="작업 절차" icon={<PlayCircle size={14} />} items={guide.steps} tone="step" ordered defaultOpen />
          <GuideBlock title="산출물" icon={<CheckCircle2 size={14} />} items={guide.outputs} tone="output" />
          <GuideBlock title="검수 기준" icon={<ShieldCheck size={14} />} items={guide.qualityChecks} tone="guard" />
        </section>
      ) : null}
    </div>
  );
}

function WorkItemRow({ item }: { item: AgentWorkItem }) {
  const sourceLabel = sourceLabels[item.source_type] ?? item.source_type;

  return (
    <Link
      href={item.href}
      className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-button border border-[var(--color-border)] bg-white/[0.03] px-3 py-2 transition hover:bg-white/[0.05]"
    >
      <span className="rounded-md bg-[var(--color-info-soft)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-info)]">{sourceLabel}</span>
      <span className="truncate text-sm font-medium text-white" title={item.summary}>{item.title}</span>
      <span className="truncate text-[10px] text-[var(--color-text-muted)]">
        {taskTypeLabel(item.task_type)}
      </span>
    </Link>
  );
}

function GuideBlock({
  title,
  icon,
  items,
  tone,
  ordered = false,
  defaultOpen = false,
}: {
  title: string;
  icon: ReactNode;
  items: string[];
  tone: "question" | "step" | "output" | "guard";
  ordered?: boolean;
  defaultOpen?: boolean;
}) {
  const toneClass = {
    question: "border-[var(--color-warning)]/15 bg-[var(--color-warning-soft)] text-[var(--color-warning)]",
    step: "border-[var(--color-info)]/15 bg-[var(--color-info-soft)] text-[var(--color-info)]",
    output: "border-[var(--color-accent)]/15 bg-[var(--color-accent-soft)] text-[var(--color-accent)]",
    guard: "border-[var(--color-danger)]/15 bg-[var(--color-danger-soft)] text-[var(--color-danger)]",
  }[tone];
  const ListTag = ordered ? "ol" : "ul";
  const visibleItems = items.slice(0, 4);
  const hiddenCount = Math.max(items.length - visibleItems.length, 0);

  return (
    <details open={defaultOpen} className={`mt-3 rounded-button border p-3 ${toneClass}`}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-medium [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">
          {icon}
          {title}
        </span>
        <span className="rounded-full bg-black/25 px-2 py-0.5 text-[10px] tracking-normal text-[#E8EEF2]">
          {items.length}개
        </span>
      </summary>
      <ListTag className="mt-2 space-y-1.5 text-xs leading-5 text-[#E8EEF2]">
        {visibleItems.map((item, index) => (
          <li key={`${title}-${index}-${item}`} className="flex gap-2">
            <span className="shrink-0 font-black opacity-70">{ordered ? `${index + 1}.` : "·"}</span>
            <span>{item}</span>
          </li>
        ))}
      </ListTag>
      {hiddenCount > 0 ? (
        <p className="mt-2 text-[11px] font-semibold text-[#8EA0AE]">
          나머지 {hiddenCount}개는 운영 가이드 원문에서 확인합니다.
        </p>
      ) : null}
    </details>
  );
}

function MetricPill({ label, tone }: { label: string; tone: "red" | "gray" | "yellow" }) {
  const toneClass = {
    red: "text-[var(--color-danger)]",
    gray: "text-[var(--color-text-secondary)]",
    yellow: "text-[var(--color-warning)]",
  }[tone];

  return <span className={`${toneClass}`}>{label}</span>;
}

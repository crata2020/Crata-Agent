"use client";

import { Maximize2, Minus, Move, Plus, RotateCcw } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { PointerEvent, ReactNode, WheelEvent } from "react";

import type { AgentActivity, AgentActivityStatus, AgentWorkItem, DashboardSummary } from "@/lib/types";

const WORLD_WIDTH = 1780;
const WORLD_HEIGHT = 840;
const NODE_WIDTH = 316;
const NODE_HEIGHT = 142;

const nodePositions: Record<string, { x: number; y: number }> = {
  crata_ceo: { x: 650, y: 70 },
  concept_guardian: { x: 140, y: 285 },
  report_editor: { x: 480, y: 285 },
  counseling_coach: { x: 820, y: 285 },
  quality_inspector: { x: 1160, y: 285 },
  operations_secretary: { x: 70, y: 555 },
  case_learner: { x: 410, y: 555 },
  relationship_analyst: { x: 750, y: 555 },
  business_designer: { x: 1090, y: 555 },
  content_strategist: { x: 1410, y: 555 },
};

const edges = [
  ["crata_ceo", "concept_guardian"],
  ["crata_ceo", "report_editor"],
  ["crata_ceo", "counseling_coach"],
  ["crata_ceo", "quality_inspector"],
  ["concept_guardian", "operations_secretary"],
  ["concept_guardian", "case_learner"],
  ["report_editor", "relationship_analyst"],
  ["quality_inspector", "business_designer"],
  ["quality_inspector", "content_strategist"],
] as const;

const statusMeta: Record<
  AgentActivityStatus,
  { label: string; dot: string; stroke: string; glow: string; badgeClass: string }
> = {
  working: {
    label: "작업 중",
    dot: "#36D47F",
    stroke: "#36D47F",
    glow: "0 0 26px rgba(54, 212, 127, 0.28)",
    badgeClass: "bg-[#102A1C] text-[#6FF0A0]",
  },
  waiting_approval: {
    label: "승인 대기",
    dot: "#F2B84B",
    stroke: "#F2B84B",
    glow: "0 0 26px rgba(242, 184, 75, 0.28)",
    badgeClass: "bg-[#302410] text-[#FFD37A]",
  },
  queued: {
    label: "후보 대기",
    dot: "#38BDF8",
    stroke: "#38BDF8",
    glow: "0 0 26px rgba(56, 189, 248, 0.25)",
    badgeClass: "bg-[#0B2535] text-[#7DD7FF]",
  },
  idle: {
    label: "대기 중",
    dot: "#77828B",
    stroke: "#46515C",
    glow: "0 0 18px rgba(120, 132, 144, 0.08)",
    badgeClass: "bg-white/[0.06] text-[#B5C0CA]",
  },
  planned: {
    label: "확장 예정",
    dot: "#6B7280",
    stroke: "#343C45",
    glow: "none",
    badgeClass: "bg-white/[0.05] text-[#A4ADB8]",
  },
};

const workItemSourceLabels: Record<AgentWorkItem["source_type"], string> = {
  candidate: "후보",
  task: "작업",
  approval: "승인",
};

const workItemStatusLabels: Record<string, string> = {
  draft: "후보 대기",
  running: "실행 중",
  pending_approval: "승인 대기",
  approved: "승인 완료",
  rejected: "반려",
  revise_requested: "수정요청",
  failed: "실패",
};

interface AgentFlowCanvasProps {
  agents: AgentActivity[];
  summary: DashboardSummary;
}

export function AgentFlowCanvas({ agents, summary }: AgentFlowCanvasProps) {
  const [view, setView] = useState({ x: 24, y: 48, scale: 0.61 });
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const dragRef = useRef<{ active: boolean; x: number; y: number }>({ active: false, x: 0, y: 0 });
  const activityById = useMemo(() => new Map(agents.map((agent) => [agent.id, agent])), [agents]);
  const leadAgent = agents.find((agent) => agent.activity_status !== "idle" && agent.activity_status !== "planned") ?? agents[0];
  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId) ?? leadAgent;
  const selectedWorkItems = selectedAgent?.work_items ?? [];

  function updateScale(nextScale: number) {
    setView((current) => ({
      ...current,
      scale: Math.min(1.35, Math.max(0.46, nextScale)),
    }));
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const nextScale = view.scale + (event.deltaY > 0 ? -0.05 : 0.05);
    updateScale(nextScale);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    dragRef.current = { active: true, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragRef.current.active) {
      return;
    }

    const dx = event.clientX - dragRef.current.x;
    const dy = event.clientY - dragRef.current.y;
    dragRef.current = { active: true, x: event.clientX, y: event.clientY };
    setView((current) => ({ ...current, x: current.x + dx, y: current.y + dy }));
  }

  function handlePointerUp() {
    dragRef.current.active = false;
  }

  return (
    <section className="relative h-[calc(100vh-2rem)] min-h-[760px] overflow-hidden rounded-[18px] border border-white/10 bg-[#05080B] shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_8%,rgba(31,107,87,0.2),transparent_34%),linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[length:auto,48px_48px,48px_48px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_35%,rgba(56,189,248,0.09),transparent_30%)]" />

      <header className="absolute left-0 right-0 top-0 z-20 flex h-[74px] items-center justify-between border-b border-white/10 bg-[#071017]/88 px-5 backdrop-blur">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[#8EA0AE]">Agent Flow</p>
          <h1 className="mt-1 text-lg font-semibold text-white">CRATA 직원 작업 맵</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden rounded-button border border-white/10 bg-white/[0.06] p-1 text-sm font-semibold text-[#A3ACB5] sm:flex">
            <span className="rounded-button bg-[#362029] px-4 py-2 text-[#FF5F6D]">Map</span>
            <span className="px-4 py-2">Grid</span>
            <span className="px-4 py-2">Feed</span>
          </div>
          <div className="rounded-button border border-white/10 bg-white/[0.06] px-3 py-2 text-xs text-[#C0CAD4]">
            <span className="mr-3 inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[#36D47F]" />
              Healthy
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[#F2B84B]" />
              승인 {summary.pending_approval_count}
            </span>
          </div>
        </div>
      </header>

      <aside className="absolute right-5 top-24 z-30 hidden w-[320px] rounded-card border border-white/10 bg-[#11161C]/94 p-4 text-white shadow-[0_18px_60px_rgba(0,0,0,0.42)] backdrop-blur xl:block">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8EA0AE]">Agent Inspector</p>
        <div className="mt-3 flex items-start gap-3">
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-[9px] border text-xs font-black"
            style={{
              borderColor: selectedAgent?.color ?? "#38BDF8",
              color: selectedAgent?.color ?? "#38BDF8",
              backgroundColor: `${selectedAgent?.color ?? "#38BDF8"}1A`,
            }}
          >
            {selectedAgent ? agentInitials(selectedAgent.display_name) : "AI"}
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold leading-5">{selectedAgent?.display_name ?? "CRATA CEO"}</h2>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#B1BDC7]">{selectedAgent?.role}</p>
          </div>
        </div>

        <div className="mt-4 rounded-card border border-white/10 bg-black/20 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-[#8E99A3]">현재 작업</p>
            {selectedAgent ? (
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${statusMeta[selectedAgent.activity_status].badgeClass}`}>
                <span className="size-1.5 rounded-full" style={{ backgroundColor: statusMeta[selectedAgent.activity_status].dot }} />
                {statusMeta[selectedAgent.activity_status].label}
              </span>
            ) : null}
          </div>
          <p className="mt-2 line-clamp-3 text-sm leading-5 text-white">{selectedAgent?.current_focus ?? "요청 대기"}</p>
          {selectedAgent?.current_task_type ? (
            <p className="mt-2 rounded-button bg-white/[0.06] px-2 py-1 text-xs font-semibold text-[#AEB9C4]">
              {selectedAgent.current_task_type}
            </p>
          ) : null}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <InspectorStat label="작업" value={selectedAgent?.workload_count ?? 0} />
          <InspectorStat label="후보" value={selectedAgent?.candidate_count ?? 0} />
          <InspectorStat label="승인" value={selectedAgent?.pending_approval_count ?? 0} />
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8EA0AE]">Work Queue</p>
            <span className="rounded-full bg-white/[0.06] px-2 py-1 text-[10px] font-semibold text-[#AEB9C4]">
              {selectedWorkItems.length}개
            </span>
          </div>
          <div className="max-h-[230px] space-y-2 overflow-y-auto pr-1">
            {selectedWorkItems.length > 0 ? (
              selectedWorkItems.map((item) => <WorkItemCard key={`${item.source_type}-${item.id}`} item={item} />)
            ) : (
              <div className="rounded-card border border-dashed border-white/10 bg-black/15 p-3 text-xs leading-5 text-[#8F9AA4]">
                이 에이전트에게 배정된 후보나 승인 대기 작업이 아직 없습니다.
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <a
            href="/request-intake"
            className="rounded-button border border-white/10 bg-white/[0.06] px-3 py-2 text-center text-xs font-semibold text-[#DDE6EE] transition hover:bg-white/10"
          >
            후보 보기
          </a>
          <a
            href="/approvals"
            className="rounded-button border border-[#F2B84B]/30 bg-[#302410] px-3 py-2 text-center text-xs font-semibold text-[#FFD37A] transition hover:bg-[#3A2B13]"
          >
            승인함
          </a>
        </div>

        <p className="mt-3 text-[11px] leading-5 text-[#7F8A93]">후보는 요청 콘솔, 승인 항목은 승인함으로 연결됩니다.</p>
      </aside>

      <div className="absolute bottom-6 left-6 z-20 flex flex-col overflow-hidden rounded-full border border-white/10 bg-[#12171D]/90 shadow-[0_16px_40px_rgba(0,0,0,0.35)] backdrop-blur">
        <CanvasButton label="확대" onClick={() => updateScale(view.scale + 0.1)}>
          <Plus size={18} />
        </CanvasButton>
        <CanvasButton label="축소" onClick={() => updateScale(view.scale - 0.1)}>
          <Minus size={18} />
        </CanvasButton>
        <CanvasButton label="리셋" onClick={() => setView({ x: 24, y: 48, scale: 0.61 })}>
          <RotateCcw size={16} />
        </CanvasButton>
        <CanvasButton label="이동 모드">
          <Move size={16} />
        </CanvasButton>
      </div>

      <div
        className="absolute inset-0 cursor-grab overflow-hidden pt-[74px] active:cursor-grabbing"
        data-testid="agent-flow-canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
      >
        <div
          className="relative"
          style={{
            width: WORLD_WIDTH,
            height: WORLD_HEIGHT,
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
            transformOrigin: "0 0",
          }}
        >
          <svg className="pointer-events-none absolute inset-0" width={WORLD_WIDTH} height={WORLD_HEIGHT} aria-hidden="true">
            {edges.map(([source, target]) => {
              const from = nodePositions[source];
              const to = nodePositions[target];
              const targetAgent = activityById.get(target);
              const meta = statusMeta[targetAgent?.activity_status ?? "idle"];
              const isMuted = targetAgent?.activity_status === "idle" || targetAgent?.activity_status === "planned";

              return (
                <g key={`${source}-${target}`}>
                  <path
                    d={edgePath(from, to)}
                    fill="none"
                    stroke={meta.stroke}
                    strokeLinecap="round"
                    strokeOpacity={isMuted ? 0.25 : 0.62}
                    strokeWidth={2}
                  />
                  <path d={arrowHeadPath(to)} fill={meta.stroke} fillOpacity={isMuted ? 0.32 : 0.72} />
                </g>
              );
            })}
          </svg>

          {agents.map((agent) => {
            const position = nodePositions[agent.id] ?? { x: 80, y: 80 };
            return (
              <AgentNode
                key={agent.id}
                agent={agent}
                x={position.x}
                y={position.y}
                selected={selectedAgent?.id === agent.id}
                onSelect={() => setSelectedAgentId(agent.id)}
              />
            );
          })}
        </div>
      </div>
      <div className="absolute bottom-6 left-1/2 z-20 hidden -translate-x-1/2 rounded-full border border-white/10 bg-[#12171D]/90 p-1 text-sm font-semibold text-[#A7B0BA] shadow-[0_16px_40px_rgba(0,0,0,0.35)] backdrop-blur md:flex">
        <span className="rounded-full px-5 py-2">Teams</span>
        <span className="rounded-full bg-[#362029] px-5 py-2 text-[#FF5F6D]">Hierarchy</span>
      </div>
      <div className="absolute bottom-6 right-6 z-20 rounded-card border border-white/10 bg-[#12171D]/90 px-4 py-3 text-sm font-semibold text-[#C2CAD2] shadow-[0_16px_40px_rgba(0,0,0,0.35)] backdrop-blur">
        <span className="mr-2 inline-flex size-2 rounded-full bg-[#FF5F6D]" />
        Live Logs
        <Maximize2 className="ml-3 inline" size={14} aria-hidden="true" />
      </div>
    </section>
  );
}

function AgentNode({
  agent,
  x,
  y,
  selected,
  onSelect,
}: {
  agent: AgentActivity;
  x: number;
  y: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const meta = statusMeta[agent.activity_status];
  const initials = agentInitials(agent.display_name);

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      onPointerDown={(event) => event.stopPropagation()}
      className="absolute cursor-pointer rounded-[10px] border bg-[#111820]/96 p-3.5 text-left text-white shadow-[0_18px_42px_rgba(0,0,0,0.38)] transition duration-150 hover:-translate-y-0.5 hover:bg-[#151D26]"
      style={{
        left: x,
        top: y,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        borderColor: meta.stroke,
        boxShadow: selected ? `${meta.glow}, 0 0 0 2px ${meta.stroke}` : meta.glow,
      }}
      aria-pressed={selected}
      aria-label={`${agent.display_name} 상세 보기`}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex size-11 shrink-0 items-center justify-center rounded-[9px] border text-xs font-black"
          style={{ borderColor: agent.color, color: agent.color, backgroundColor: `${agent.color}1A` }}
        >
          {initials || "AI"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
            <h3 className="min-w-0 max-w-[170px] text-[16px] font-semibold leading-5 text-[#F4F7FA]">
              {agent.display_name}
            </h3>
            <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${meta.badgeClass}`}>
              <span className="size-1.5 rounded-full" style={{ backgroundColor: meta.dot }} />
              {meta.label}
            </span>
          </div>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#94A1AD]">
            {agent.enabled ? "LOCAL" : "PLANNED"}
          </p>
        </div>
      </div>
      <p className="mt-2 line-clamp-2 min-h-[24px] text-[13px] font-medium leading-5 text-[#DDE6EE]">
        {agent.current_focus}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold">
        <span className="rounded-full bg-[#2A1820] px-2 py-1 text-[#FF6B7A]">{agent.workload_count} 작업</span>
        <span className="rounded-full bg-white/[0.07] px-2 py-1 text-[#B1BDC8]">{agent.candidate_count} 후보</span>
        {agent.pending_approval_count > 0 ? (
          <span className="rounded-full bg-[#312511] px-2 py-1 text-[#F2B84B]">{agent.pending_approval_count} 승인</span>
        ) : null}
      </div>
    </button>
  );
}

function agentInitials(displayName: string) {
  return displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function InspectorStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-button bg-white/[0.06] px-3 py-2">
      <p className="text-sm font-semibold text-white">{value}</p>
      <p className="mt-0.5 text-[11px] text-[#A5B0BA]">{label}</p>
    </div>
  );
}

function WorkItemCard({ item }: { item: AgentWorkItem }) {
  const statusLabel = workItemStatusLabels[item.status] ?? item.status;
  const sourceLabel = workItemSourceLabels[item.source_type];

  return (
    <a
      href={item.href}
      className="block rounded-card border border-white/10 bg-[#0B1117]/88 p-3 transition hover:border-[#38BDF8]/40 hover:bg-[#101923]"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full bg-white/[0.06] px-2 py-1 text-[10px] font-semibold text-[#C2CDD8]">
          {sourceLabel}
        </span>
        <span className="rounded-full bg-[#17212B] px-2 py-1 text-[10px] font-semibold text-[#8FD3FF]">
          {statusLabel}
        </span>
      </div>
      <p className="mt-2 line-clamp-2 text-sm font-semibold leading-5 text-white">{item.title}</p>
      <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#9EABB6]">{item.summary}</p>
      <p className="mt-2 truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6F7D89]">
        {item.task_type}
      </p>
    </a>
  );
}

function CanvasButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.();
      }}
      className="flex size-11 items-center justify-center border-b border-white/10 text-[#C0C9D2] transition hover:bg-white/10 hover:text-white last:border-b-0"
    >
      {children}
    </button>
  );
}

function edgePath(from: { x: number; y: number }, to: { x: number; y: number }) {
  const startX = from.x + NODE_WIDTH / 2;
  const startY = from.y + NODE_HEIGHT + 8;
  const endX = to.x + NODE_WIDTH / 2;
  const endY = to.y - 26;
  const midY = startY + (endY - startY) * 0.54;

  return `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;
}

function arrowHeadPath(to: { x: number; y: number }) {
  const centerX = to.x + NODE_WIDTH / 2;
  const tipY = to.y - 10;
  const baseY = tipY - 14;

  return `M ${centerX} ${tipY} L ${centerX - 7} ${baseY} L ${centerX + 7} ${baseY} Z`;
}

"use client";

import { Maximize2, Minus, Move, Plus, RotateCcw } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { PointerEvent, ReactNode, WheelEvent } from "react";

import type { AgentActivity, AgentActivityStatus, DashboardSummary } from "@/lib/types";

const WORLD_WIDTH = 1850;
const WORLD_HEIGHT = 900;
const NODE_WIDTH = 268;
const NODE_HEIGHT = 118;

const nodePositions: Record<string, { x: number; y: number }> = {
  crata_ceo: { x: 790, y: 70 },
  concept_guardian: { x: 330, y: 310 },
  report_editor: { x: 665, y: 310 },
  counseling_coach: { x: 1000, y: 310 },
  quality_inspector: { x: 1335, y: 310 },
  case_learner: { x: 475, y: 575 },
  relationship_analyst: { x: 810, y: 575 },
  business_designer: { x: 1145, y: 575 },
  content_strategist: { x: 1480, y: 575 },
  operations_secretary: { x: 140, y: 575 },
};

const edges = [
  ["crata_ceo", "concept_guardian"],
  ["crata_ceo", "report_editor"],
  ["crata_ceo", "counseling_coach"],
  ["crata_ceo", "quality_inspector"],
  ["concept_guardian", "case_learner"],
  ["report_editor", "relationship_analyst"],
  ["quality_inspector", "business_designer"],
  ["quality_inspector", "content_strategist"],
  ["concept_guardian", "operations_secretary"],
] as const;

const statusMeta: Record<AgentActivityStatus, { label: string; dot: string; stroke: string; glow: string }> = {
  working: {
    label: "작업 중",
    dot: "#36D47F",
    stroke: "#36D47F",
    glow: "0 0 22px rgba(54, 212, 127, 0.25)",
  },
  waiting_approval: {
    label: "승인 대기",
    dot: "#F2B84B",
    stroke: "#F2B84B",
    glow: "0 0 22px rgba(242, 184, 75, 0.25)",
  },
  queued: {
    label: "후보 대기",
    dot: "#38BDF8",
    stroke: "#38BDF8",
    glow: "0 0 22px rgba(56, 189, 248, 0.22)",
  },
  idle: {
    label: "대기 중",
    dot: "#77828B",
    stroke: "#4B5563",
    glow: "none",
  },
  planned: {
    label: "확장 예정",
    dot: "#5F6670",
    stroke: "#333B45",
    glow: "none",
  },
};

interface AgentFlowCanvasProps {
  agents: AgentActivity[];
  summary: DashboardSummary;
}

export function AgentFlowCanvas({ agents, summary }: AgentFlowCanvasProps) {
  const [view, setView] = useState({ x: 40, y: 42, scale: 0.82 });
  const dragRef = useRef<{ active: boolean; x: number; y: number }>({ active: false, x: 0, y: 0 });
  const activityById = useMemo(() => new Map(agents.map((agent) => [agent.id, agent])), [agents]);
  const leadAgent = agents.find((agent) => agent.activity_status !== "idle" && agent.activity_status !== "planned") ?? agents[0];

  function updateScale(nextScale: number) {
    setView((current) => ({
      ...current,
      scale: Math.min(1.4, Math.max(0.48, nextScale)),
    }));
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const nextScale = view.scale + (event.deltaY > 0 ? -0.06 : 0.06);
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
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_10%,rgba(31,107,87,0.18),transparent_34%),linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[length:auto,48px_48px,48px_48px]" />
      <header className="absolute left-0 right-0 top-0 z-20 flex h-[74px] items-center justify-between border-b border-white/10 bg-[#071017]/85 px-5 backdrop-blur">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[#8EA0AE]">Agent Flow</p>
          <h1 className="mt-1 text-lg font-semibold text-white">CRATA 직원 작업 맵</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden rounded-button border border-white/10 bg-white/[0.06] p-1 text-sm font-semibold text-[#858F99] sm:flex">
            <span className="rounded-button bg-[#362029] px-4 py-2 text-[#FF5F6D]">Map</span>
            <span className="px-4 py-2">Grid</span>
            <span className="px-4 py-2">Feed</span>
          </div>
          <div className="rounded-button border border-white/10 bg-white/[0.06] px-3 py-2 text-xs text-[#ADB7C0]">
            <span className="mr-3 inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[#36D47F]" />
              Healthy
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[#F2B84B]" />
              {summary.pending_approval_count} approvals
            </span>
          </div>
        </div>
      </header>

      <aside className="absolute right-5 top-24 z-20 w-[280px] rounded-card border border-white/10 bg-[#11161C]/90 p-4 text-white shadow-[0_18px_50px_rgba(0,0,0,0.32)] backdrop-blur">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8EA0AE]">Live Inspector</p>
        <h2 className="mt-3 text-base font-semibold">{leadAgent?.display_name ?? "CRATA CEO"}</h2>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#9EAAB4]">{leadAgent?.role}</p>
        <div className="mt-4 rounded-card border border-white/10 bg-black/20 p-3">
          <p className="text-[11px] text-[#7F8A93]">현재 작업</p>
          <p className="mt-1 line-clamp-3 text-sm leading-5 text-white">{leadAgent?.current_focus ?? "새 요청 대기"}</p>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <InspectorStat label="후보" value={summary.candidate_task_count} />
          <InspectorStat label="실행" value={summary.running_task_count} />
          <InspectorStat label="승인" value={summary.pending_approval_count} />
        </div>
      </aside>

      <div className="absolute bottom-6 left-6 z-20 flex flex-col overflow-hidden rounded-full border border-white/10 bg-[#12171D]/90 shadow-[0_16px_40px_rgba(0,0,0,0.35)] backdrop-blur">
        <CanvasButton label="확대" onClick={() => updateScale(view.scale + 0.1)}>
          <Plus size={18} />
        </CanvasButton>
        <CanvasButton label="축소" onClick={() => updateScale(view.scale - 0.1)}>
          <Minus size={18} />
        </CanvasButton>
        <CanvasButton label="리셋" onClick={() => setView({ x: 40, y: 42, scale: 0.82 })}>
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
            <defs>
              <marker id="agent-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
                <path d="M0,0 L8,3 L0,6 Z" fill="#2C3640" />
              </marker>
            </defs>
            {edges.map(([source, target]) => {
              const from = nodePositions[source];
              const to = nodePositions[target];
              const targetAgent = activityById.get(target);
              return (
                <path
                  key={`${source}-${target}`}
                  d={edgePath(from, to)}
                  fill="none"
                  stroke={statusMeta[targetAgent?.activity_status ?? "idle"].stroke}
                  strokeOpacity={targetAgent?.activity_status === "idle" || targetAgent?.activity_status === "planned" ? 0.22 : 0.54}
                  strokeWidth={2}
                  markerEnd="url(#agent-arrow)"
                />
              );
            })}
          </svg>

          {agents.map((agent) => {
            const position = nodePositions[agent.id] ?? { x: 80, y: 80 };
            return (
              <AgentNode key={agent.id} agent={agent} x={position.x} y={position.y} />
            );
          })}
        </div>
      </div>
      <div className="absolute bottom-6 left-1/2 z-20 hidden -translate-x-1/2 rounded-full border border-white/10 bg-[#12171D]/90 p-1 text-sm font-semibold text-[#8F98A3] shadow-[0_16px_40px_rgba(0,0,0,0.35)] backdrop-blur md:flex">
        <span className="rounded-full px-5 py-2">Teams</span>
        <span className="rounded-full bg-[#362029] px-5 py-2 text-[#FF5F6D]">Hierarchy</span>
      </div>
      <div className="absolute bottom-6 right-6 z-20 rounded-card border border-white/10 bg-[#12171D]/90 px-4 py-3 text-sm font-semibold text-[#B7C0C9] shadow-[0_16px_40px_rgba(0,0,0,0.35)] backdrop-blur">
        <span className="mr-2 inline-flex size-2 rounded-full bg-[#FF5F6D]" />
        Live Logs
        <Maximize2 className="ml-3 inline" size={14} aria-hidden="true" />
      </div>
    </section>
  );
}

function AgentNode({ agent, x, y }: { agent: AgentActivity; x: number; y: number }) {
  const meta = statusMeta[agent.activity_status];
  const initials = agent.display_name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <article
      className="absolute rounded-[10px] border bg-[#15191F]/96 p-4 text-white shadow-[0_18px_42px_rgba(0,0,0,0.38)]"
      style={{
        left: x,
        top: y,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        borderColor: meta.stroke,
        boxShadow: meta.glow,
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-[9px] border text-xs font-black"
          style={{ borderColor: agent.color, color: agent.color, backgroundColor: `${agent.color}1A` }}
        >
          {initials || "AI"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate font-mono text-[15px] font-semibold tracking-[-0.01em] text-[#E8EEF2]">
              @{agent.display_name}
            </h3>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-[10px] font-semibold text-[#AEB8C2]">
              <span className="size-1.5 rounded-full" style={{ backgroundColor: meta.dot }} />
              {meta.label}
            </span>
          </div>
          <p className="mt-1 truncate text-[11px] font-semibold uppercase tracking-[0.1em] text-[#7D8792]">
            {agent.enabled ? "LOCAL" : "PLANNED"}
          </p>
        </div>
      </div>
      <p className="mt-3 line-clamp-1 text-[13px] font-medium text-[#D4DBE2]">{agent.current_focus}</p>
      <div className="mt-3 flex items-center gap-2 text-[11px] font-semibold">
        <span className="rounded-full bg-[#2A1820] px-2 py-1 text-[#FF6B7A]">{agent.workload_count} tasks</span>
        <span className="rounded-full bg-white/7 px-2 py-1 text-[#909BA6]">{agent.candidate_count} 후보</span>
        {agent.pending_approval_count > 0 ? (
          <span className="rounded-full bg-[#312511] px-2 py-1 text-[#F2B84B]">{agent.pending_approval_count} 승인</span>
        ) : null}
      </div>
    </article>
  );
}

function InspectorStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-button bg-white/[0.06] px-3 py-2">
      <p className="text-sm font-semibold text-white">{value}</p>
      <p className="mt-0.5 text-[11px] text-[#8F9AA4]">{label}</p>
    </div>
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
      className="flex size-11 items-center justify-center border-b border-white/10 text-[#B7C0C9] transition hover:bg-white/10 hover:text-white last:border-b-0"
    >
      {children}
    </button>
  );
}

function edgePath(from: { x: number; y: number }, to: { x: number; y: number }) {
  const startX = from.x + NODE_WIDTH / 2;
  const startY = from.y + NODE_HEIGHT;
  const endX = to.x + NODE_WIDTH / 2;
  const endY = to.y;
  const midY = startY + (endY - startY) * 0.55;

  return `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;
}

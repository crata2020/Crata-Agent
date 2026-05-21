"use client";

import {
  Bot,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Database,
  FileText,
  Gauge,
  Info,
  Maximize2,
  MessageSquareText,
  Minus,
  Plus,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState } from "react";

import type {
  AgentActivity,
  AgentActivityStatus,
  DashboardSummary,
  WorkflowRunActivity,
} from "@/lib/types";

const statusMeta: Record<AgentActivityStatus, { label: string; dot: string; cls: string }> = {
  working: { label: "작업 중", dot: "#35E48A", cls: "border-emerald-300/35 bg-emerald-400/10 text-emerald-100" },
  waiting_approval: { label: "승인 대기", dot: "#F2B84B", cls: "border-amber-300/35 bg-amber-400/10 text-amber-100" },
  queued: { label: "후보 대기", dot: "#4AA8FF", cls: "border-sky-300/35 bg-sky-400/10 text-sky-100" },
  idle: { label: "대기 중", dot: "#8A95A7", cls: "border-white/10 bg-white/[0.05] text-[#C8D0DA]" },
  planned: { label: "확장 예정", dot: "#697280", cls: "border-white/10 bg-white/[0.04] text-[#9BA4B0]" },
};

const roomDefs = [
  {
    id: "command",
    title: "지휘본부",
    subtitle: "요청 분류와 작업 조율",
    icon: ShieldCheck,
    color: "#5B7CFF",
    x: 84,
    y: 78,
    w: 445,
    h: 205,
    agents: ["crata_ceo"],
  },
  {
    id: "knowledge",
    title: "검사·지식 연구실",
    subtitle: "공식 개념지도와 유형 판별",
    icon: Database,
    color: "#34D399",
    x: 610,
    y: 98,
    w: 410,
    h: 260,
    agents: ["concept_guardian", "relationship_analyst"],
  },
  {
    id: "report",
    title: "결과지 제작실",
    subtitle: "문구 작성, 톤 조정, 승인 전 검수",
    icon: FileText,
    color: "#C084FC",
    x: 1054,
    y: 130,
    w: 350,
    h: 265,
    agents: ["report_editor", "quality_inspector"],
  },
  {
    id: "case",
    title: "상담 분석실",
    subtitle: "상담 사례와 관계 패턴 해석",
    icon: MessageSquareText,
    color: "#F472B6",
    x: 690,
    y: 430,
    w: 390,
    h: 250,
    agents: ["counseling_coach", "case_learner"],
  },
  {
    id: "growth",
    title: "기획 스튜디오",
    subtitle: "사업안, 콘텐츠, 운영 브리핑",
    icon: BriefcaseBusiness,
    color: "#F59E0B",
    x: 174,
    y: 418,
    w: 450,
    h: 245,
    agents: ["business_designer", "content_strategist", "operations_secretary"],
  },
] as const;

const taskTypeLabel: Record<string, string> = {
  business_planning: "사업 기획",
  content_marketing: "콘텐츠",
  report_phrase_revision: "결과지",
  counseling_case_learning: "상담 사례",
  relationship_pattern_analysis: "관계 분석",
  general_agent_task: "일반 작업",
};

interface Props {
  agents: AgentActivity[];
  summary: DashboardSummary;
  workflowRuns?: WorkflowRunActivity[];
}

export function AgentFlowCanvas({ agents, summary, workflowRuns = [] }: Props) {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(agents[0]?.id ?? null);
  const [hoveredAgentId, setHoveredAgentId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.86);
  const [query, setQuery] = useState("");

  const agentById = useMemo(() => new Map(agents.map((agent) => [agent.id, agent])), [agents]);
  const selectedAgent = selectedAgentId ? agentById.get(selectedAgentId) ?? null : null;
  const hoveredAgent = hoveredAgentId ? agentById.get(hoveredAgentId) ?? null : null;
  const visibleRooms = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return roomDefs;

    return roomDefs.filter((room) => {
      const roomText = `${room.title} ${room.subtitle}`.toLowerCase();
      const agentText = room.agents
        .map((id) => agentById.get(id))
        .filter(Boolean)
        .map((agent) => `${agent?.display_name} ${agent?.role} ${agent?.current_focus}`)
        .join(" ")
        .toLowerCase();
      return `${roomText} ${agentText}`.includes(normalized);
    });
  }, [agentById, query]);

  const activeRuns = workflowRuns.filter((run) => run.status === "running" || run.status === "queued");
  const recentRuns = workflowRuns.slice(0, 4);

  return (
    <div className="flex h-full min-h-0 bg-[#06080A] text-[#EAF0F6]">
      <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <OfficeTopBar
          summary={summary}
          activeRuns={activeRuns.length}
          zoom={zoom}
          onZoomIn={() => setZoom((value) => Math.min(1.18, value + 0.08))}
          onZoomOut={() => setZoom((value) => Math.max(0.64, value - 0.08))}
          onFit={() => setZoom(0.86)}
          query={query}
          onQueryChange={setQuery}
        />

        <div className="relative min-h-0 flex-1 overflow-auto crata-office-floor">
          <div className="pointer-events-none absolute inset-0 crata-office-grid" />
          <div className="pointer-events-none absolute left-8 top-8 z-10 hidden rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-[11px] text-[#A9B2BE] backdrop-blur md:block">
            휠/버튼으로 확대 비율 조정 · 에이전트를 선택하면 우측 브리핑이 바뀝니다.
          </div>

          <div
            className="relative mx-auto h-[760px] w-[1490px] origin-top-left"
            style={{ transform: `scale(${zoom})`, transformOrigin: "42px 36px" }}
          >
            <OfficeConnectors />

            {visibleRooms.map((room) => (
              <OfficeRoom
                key={room.id}
                room={room}
                agents={room.agents.map((id) => agentById.get(id)).filter((agent): agent is AgentActivity => Boolean(agent))}
                selectedAgentId={selectedAgentId}
                onSelectAgent={setSelectedAgentId}
                onHoverAgent={setHoveredAgentId}
              />
            ))}

            {hoveredAgent ? <AgentHoverCard agent={hoveredAgent} /> : null}
          </div>
        </div>
      </section>

      <OfficeInspector agent={selectedAgent} summary={summary} recentRuns={recentRuns} />
    </div>
  );
}

function OfficeTopBar({
  summary,
  activeRuns,
  zoom,
  query,
  onQueryChange,
  onZoomIn,
  onZoomOut,
  onFit,
}: {
  summary: DashboardSummary;
  activeRuns: number;
  zoom: number;
  query: string;
  onQueryChange: (value: string) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
}) {
  return (
    <header className="z-20 flex h-[58px] shrink-0 items-center gap-3 border-b border-white/[0.07] bg-[#11161D]/95 px-4 shadow-[0_1px_0_rgba(255,255,255,0.04)] backdrop-blur">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-8 items-center justify-center rounded-md border border-[#6B7CFF]/35 bg-[#6B7CFF]/12 text-[#B7C2FF]">
          <Bot size={16} aria-hidden />
        </span>
        <div className="hidden min-w-[120px] sm:block">
          <p className="font-mono text-[11px] font-black uppercase tracking-[0.18em] text-white">Agent Office</p>
          <p className="text-[10px] text-[#768291]">CRATA OS Visualizer</p>
        </div>
      </div>

      <div className="hidden min-w-0 flex-1 items-center gap-2 xl:flex">
        <OfficeChip label="활성" value={summary.active_agent_count} color="#34D399" />
        <OfficeChip label="후보" value={summary.candidate_task_count} color="#60A5FA" />
        <OfficeChip label="실행" value={summary.running_task_count + activeRuns} color="#A78BFA" />
        <OfficeChip label="승인" value={summary.pending_approval_count} color="#F59E0B" />
        <OfficeChip label="산출물" value={summary.artifact_count} color="#F472B6" />
      </div>

      <label className="ml-auto hidden h-8 min-w-[220px] items-center gap-2 rounded-md border border-white/10 bg-black/30 px-2.5 text-[#8D97A5] focus-within:border-[#6B7CFF]/50 md:flex">
        <Search size={13} aria-hidden />
        <span className="sr-only">오피스 검색</span>
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="부서·에이전트 검색"
          className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-[#6F7987]"
        />
      </label>

      <div className="flex shrink-0 items-center gap-1 rounded-md border border-white/10 bg-black/25 p-1">
        <IconButton label="축소" onClick={onZoomOut} icon={Minus} />
        <button
          type="button"
          className="h-7 min-w-12 rounded px-2 font-mono text-[10px] font-bold text-[#B7C2D0] hover:bg-white/[0.05]"
          onClick={onFit}
        >
          {Math.round(zoom * 100)}%
        </button>
        <IconButton label="확대" onClick={onZoomIn} icon={Plus} />
        <IconButton label="맞춤" onClick={onFit} icon={Maximize2} />
      </div>
    </header>
  );
}

function OfficeChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <span
      className="inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border bg-black/25 px-2.5 text-[11px] font-bold"
      style={{ borderColor: `${color}55`, color }}
    >
      <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
      <span className="font-mono text-white">{value}</span>
    </span>
  );
}

function IconButton({
  label,
  onClick,
  icon: Icon,
}: {
  label: string;
  onClick: () => void;
  icon: typeof Plus;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-7 items-center justify-center rounded text-[#AEB8C5] hover:bg-white/[0.07] hover:text-white"
    >
      <Icon size={13} aria-hidden />
    </button>
  );
}

function OfficeConnectors() {
  return (
    <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="office-line" x1="0" x2="1">
          <stop stopColor="#6B7CFF" stopOpacity="0.15" />
          <stop offset="0.48" stopColor="#34D399" stopOpacity="0.42" />
          <stop offset="1" stopColor="#F472B6" stopOpacity="0.18" />
        </linearGradient>
      </defs>
      <path d="M530 180 C600 180 580 220 610 230" stroke="url(#office-line)" strokeWidth="2" fill="none" />
      <path d="M1020 235 C1080 235 1040 275 1054 292" stroke="url(#office-line)" strokeWidth="2" fill="none" />
      <path d="M840 358 C840 400 835 406 835 430" stroke="url(#office-line)" strokeWidth="2" fill="none" />
      <path d="M624 520 C660 520 648 505 690 508" stroke="url(#office-line)" strokeWidth="2" fill="none" />
      <path d="M410 283 C410 350 410 380 410 418" stroke="url(#office-line)" strokeWidth="2" fill="none" />
      <circle cx="610" cy="230" r="4" fill="#34D399" opacity="0.72" />
      <circle cx="1054" cy="292" r="4" fill="#C084FC" opacity="0.72" />
      <circle cx="690" cy="508" r="4" fill="#F472B6" opacity="0.72" />
    </svg>
  );
}

function OfficeRoom({
  room,
  agents,
  selectedAgentId,
  onSelectAgent,
  onHoverAgent,
}: {
  room: (typeof roomDefs)[number];
  agents: AgentActivity[];
  selectedAgentId: string | null;
  onSelectAgent: (id: string) => void;
  onHoverAgent: (id: string | null) => void;
}) {
  const Icon = room.icon;
  const load = agents.reduce((sum, agent) => sum + agent.workload_count + agent.candidate_count, 0);

  return (
    <section
      className="absolute z-10 rounded-[7px] border p-4 shadow-[0_18px_55px_rgba(0,0,0,0.32)]"
      style={{
        left: room.x,
        top: room.y,
        width: room.w,
        height: room.h,
        borderColor: `${room.color}72`,
        background: `linear-gradient(135deg, ${room.color}25, rgba(14, 16, 22, 0.93) 48%, ${room.color}12)`,
        boxShadow: `0 0 0 1px ${room.color}20 inset, 0 18px 55px rgba(0,0,0,0.36), 0 0 36px ${room.color}16`,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-black/25"
            style={{ borderColor: `${room.color}55`, color: room.color }}
          >
            <Icon size={15} aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-black text-white">{room.title}</h2>
            <p className="mt-0.5 truncate text-[11px] text-[#A9B2BE]">{room.subtitle}</p>
          </div>
        </div>
        <span className="rounded-md border border-white/10 bg-black/25 px-2 py-1 font-mono text-[10px] font-bold text-[#C7D0DC]">
          {agents.length}명 · {load}건
        </span>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-x-4 gap-y-5">
        {agents.map((agent, index) => (
          <button
            key={agent.id}
            type="button"
            aria-label={`${agent.display_name} 프로필 열기`}
            onMouseEnter={() => onHoverAgent(agent.id)}
            onMouseLeave={() => onHoverAgent(null)}
            onFocus={() => onHoverAgent(agent.id)}
            onBlur={() => onHoverAgent(null)}
            onClick={() => onSelectAgent(agent.id)}
            className="group relative flex min-h-[74px] flex-col items-center justify-end rounded-md border border-transparent px-1 pb-1 outline-none hover:border-white/10 hover:bg-white/[0.04] focus-visible:border-white/30"
          >
            <AgentSprite agent={agent} selected={selectedAgentId === agent.id} roomColor={room.color} crown={index === 0 && room.id === "command"} />
            <span className="mt-1 max-w-[78px] truncate text-[11px] font-semibold text-[#C9D2DE] group-hover:text-white">
              {agent.display_name}
            </span>
            {agent.workload_count + agent.pending_approval_count > 0 ? (
              <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded bg-black/55 text-[9px] font-black text-white">
                {agent.workload_count + agent.pending_approval_count}
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </section>
  );
}

function AgentSprite({
  agent,
  selected,
  roomColor,
  crown,
}: {
  agent: AgentActivity;
  selected: boolean;
  roomColor: string;
  crown?: boolean;
}) {
  const meta = statusMeta[agent.activity_status];

  return (
    <span className="relative block h-12 w-16">
      <span
        className="absolute left-1/2 top-0 h-5 w-6 -translate-x-1/2 rounded-t-[6px] border border-white/20"
        style={{ backgroundColor: selected ? roomColor : "#6B83C7" }}
      />
      {crown ? (
        <span className="absolute left-1/2 top-[-7px] h-3 w-6 -translate-x-1/2 rounded-t-md bg-[#F6D35D] shadow-[0_0_12px_rgba(246,211,93,0.45)]" />
      ) : null}
      <span className="absolute left-1/2 top-[13px] h-4 w-5 -translate-x-1/2 rounded-[3px] bg-[#F2C8A5]" />
      <span className="absolute left-[19px] top-[21px] h-4 w-7 rounded-t-md border border-white/20" style={{ backgroundColor: agent.color }} />
      <span className="absolute left-[8px] top-[34px] h-[6px] w-12 rounded-sm bg-[#8A6E4F]" />
      <span className="absolute left-[14px] top-[39px] h-[5px] w-7 rounded-sm bg-[#233137]" />
      <span className="absolute left-[25px] top-[37px] size-1.5 rounded-full" style={{ backgroundColor: meta.dot, boxShadow: `0 0 10px ${meta.dot}` }} />
      <span className="absolute right-[5px] top-[2px] rounded-md border border-emerald-300/25 bg-black/45 px-1 font-mono text-[10px] text-emerald-200 opacity-0 shadow-xl transition group-hover:opacity-100">
        ...
      </span>
    </span>
  );
}

function AgentHoverCard({ agent }: { agent: AgentActivity }) {
  const meta = statusMeta[agent.activity_status];

  return (
    <div className="absolute left-[558px] top-[300px] z-40 w-[372px] rounded-lg border border-white/15 bg-[#05070B]/95 p-4 shadow-[0_26px_80px_rgba(0,0,0,0.62)] backdrop-blur">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border text-base font-black" style={{ borderColor: `${agent.color}66`, color: agent.color, backgroundColor: `${agent.color}1C` }}>
          {agent.display_name.slice(0, 1)}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-black tracking-tight text-white">{agent.display_name}</h3>
          <p className="mt-1 truncate text-xs font-semibold text-[#AAB4C0]">{agent.role}</p>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-black ${meta.cls}`}>
          <span className="size-1.5 rounded-full" style={{ backgroundColor: meta.dot }} />
          {meta.label}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
        <MiniMetric label="작업" value={agent.workload_count} />
        <MiniMetric label="후보" value={agent.candidate_count} />
        <MiniMetric label="승인" value={agent.pending_approval_count} />
      </div>
      <p className="mt-3 line-clamp-2 text-[12px] leading-5 text-[#9FAAB8]">{agent.current_focus || "대기 중입니다."}</p>
    </div>
  );
}

function OfficeInspector({
  agent,
  summary,
  recentRuns,
}: {
  agent: AgentActivity | null;
  summary: DashboardSummary;
  recentRuns: WorkflowRunActivity[];
}) {
  return (
    <aside className="hidden w-[354px] shrink-0 overflow-y-auto border-l border-white/[0.07] bg-[#0E1218] 2xl:block">
      <div className="border-b border-white/[0.07] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-[#7E8998]">Operator Panel</p>
            <h2 className="mt-1 text-lg font-black text-white">운영 현황</h2>
          </div>
          <span className="flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-[#B8C2D0]">
            <Info size={16} aria-hidden />
          </span>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <section className="rounded-lg border border-white/[0.08] bg-black/20 p-3">
          <p className="mb-3 text-[11px] font-black text-[#AEB8C5]">시스템 요약</p>
          <div className="grid grid-cols-2 gap-2">
            <MiniMetric label="에이전트" value={summary.agent_count} />
            <MiniMetric label="활성" value={summary.active_agent_count} />
            <MiniMetric label="후보" value={summary.candidate_task_count} />
            <MiniMetric label="승인" value={summary.pending_approval_count} />
          </div>
        </section>

        {agent ? (
          <section className="rounded-lg border border-white/[0.08] bg-black/25 p-4">
            <div className="flex items-start gap-3">
              <span className="flex size-12 items-center justify-center rounded-xl border text-lg font-black" style={{ borderColor: `${agent.color}66`, color: agent.color, backgroundColor: `${agent.color}1C` }}>
                {agent.display_name.slice(0, 1)}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-base font-black text-white">{agent.display_name}</h3>
                <p className="mt-1 text-[12px] leading-4 text-[#A5AFBC]">{agent.role}</p>
              </div>
            </div>
            <div className="mt-4">
              <AgentStatusBadge status={agent.activity_status} />
              <p className="mt-3 text-[13px] leading-5 text-[#D8DEE7]">{agent.current_focus || "요청을 기다리는 중입니다."}</p>
            </div>
            <div className="mt-4 flex gap-2">
              <a href="/activity" className="flex h-9 flex-1 items-center justify-center rounded-md border border-white/10 bg-white/[0.05] text-xs font-bold text-[#CFD7E2] hover:bg-white/[0.08]">
                활동 로그
              </a>
              <a href="/request-intake" className="flex h-9 flex-1 items-center justify-center rounded-md border border-emerald-300/25 bg-emerald-400/10 text-xs font-bold text-emerald-100 hover:bg-emerald-400/15">
                요청 배정
              </a>
            </div>
          </section>
        ) : null}

        <section className="rounded-lg border border-white/[0.08] bg-black/20 p-3">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-black text-[#AEB8C5]">최근 실행</p>
            <ChevronDown size={14} className="text-[#6F7B8B]" aria-hidden />
          </div>
          <div className="space-y-2">
            {recentRuns.length > 0 ? (
              recentRuns.map((run) => <RunRow key={run.id} run={run} />)
            ) : (
              <div className="rounded-md border border-dashed border-white/10 px-3 py-5 text-center text-xs text-[#7C8796]">
                아직 실행 기록이 없습니다.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-white/[0.08] bg-black/20 p-3">
          <p className="mb-3 text-[11px] font-black text-[#AEB8C5]">참고해서 반영한 패턴</p>
          <ul className="space-y-2 text-[12px] leading-5 text-[#AAB4C0]">
            <li className="flex gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-300" />에이전트를 카드 목록보다 부서별 오피스 공간으로 배치</li>
            <li className="flex gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-300" />상태·비용·승인 같은 운영 신호를 상단 칩으로 고정</li>
            <li className="flex gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-300" />선택한 에이전트의 역할과 현재 작업을 즉시 inspect</li>
          </ul>
        </section>
      </div>
    </aside>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-white/[0.07] bg-white/[0.035] px-3 py-2">
      <p className="font-mono text-lg font-black text-white">{value}</p>
      <p className="mt-0.5 text-[10px] font-bold text-[#7D8795]">{label}</p>
    </div>
  );
}

function AgentStatusBadge({ status }: { status: AgentActivityStatus }) {
  const meta = statusMeta[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black ${meta.cls}`}>
      <span className="size-1.5 rounded-full" style={{ backgroundColor: meta.dot, boxShadow: `0 0 8px ${meta.dot}` }} />
      {meta.label}
    </span>
  );
}

function RunRow({ run }: { run: WorkflowRunActivity }) {
  const Icon = run.status === "completed" ? CheckCircle2 : run.status === "running" ? Gauge : ClipboardCheck;
  const taskLabel = run.task_type ? taskTypeLabel[run.task_type] ?? run.task_type : "워크플로우";

  return (
    <a href={run.task_id ? `/activity?taskId=${encodeURIComponent(run.task_id)}` : "/activity"} className="block rounded-md border border-white/[0.07] bg-white/[0.035] p-3 hover:bg-white/[0.06]">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex size-7 items-center justify-center rounded-md bg-[#6B7CFF]/12 text-[#B7C2FF]">
          <Icon size={14} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-white">{run.task_title || run.workflow_type}</p>
          <p className="mt-1 text-[11px] text-[#7E8998]">{taskLabel} · {run.current_step || run.status}</p>
        </div>
      </div>
    </a>
  );
}

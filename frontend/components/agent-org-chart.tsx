"use client";

import {
  Brain,
  BriefcaseBusiness,
  CalendarClock,
  Crown,
  FileText,
  HeartHandshake,
  Minus,
  Network,
  PenLine,
  Plus,
  ShieldCheck,
  Target,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";

import type { AgentActivity } from "@/lib/types";

interface AgentOrgChartProps {
  agents: AgentActivity[];
}

type OrgNode = {
  id: string;
  x: number;
  y: number;
  icon: LucideIcon;
  fallbackName: string;
  fallbackRole: string;
};

const cardWidth = 228;
const cardHeight = 104;

const orgNodes: OrgNode[] = [
  {
    id: "crata_ceo",
    x: 506,
    y: 42,
    icon: Crown,
    fallbackName: "CRATA CEO",
    fallbackRole: "전체 라우팅과 작업 조율",
  },
  {
    id: "concept_guardian",
    x: 128,
    y: 220,
    icon: Brain,
    fallbackName: "개념수호자",
    fallbackRole: "공식 지식과 개념 일관성 검수",
  },
  {
    id: "business_designer",
    x: 506,
    y: 220,
    icon: BriefcaseBusiness,
    fallbackName: "사업설계자",
    fallbackRole: "제안서, 상품, 프로그램 기획",
  },
  {
    id: "counseling_coach",
    x: 884,
    y: 220,
    icon: HeartHandshake,
    fallbackName: "상담 코치",
    fallbackRole: "유형 기반 상담 답변 초안",
  },
  {
    id: "relationship_analyst",
    x: 56,
    y: 416,
    icon: Network,
    fallbackName: "관계분석가",
    fallbackRole: "유형 조합과 관계 패턴 분석",
  },
  {
    id: "quality_inspector",
    x: 362,
    y: 416,
    icon: ShieldCheck,
    fallbackName: "품질검수관",
    fallbackRole: "안전성, 톤, 승인 준비 상태 검수",
  },
  {
    id: "content_strategist",
    x: 668,
    y: 416,
    icon: PenLine,
    fallbackName: "콘텐츠전략가",
    fallbackRole: "홍보, 유튜브, 블로그, 홈페이지 문구",
  },
  {
    id: "case_learner",
    x: 974,
    y: 416,
    icon: Target,
    fallbackName: "사례학습가",
    fallbackRole: "상담 사례 추출과 학습 후보 생성",
  },
  {
    id: "report_editor",
    x: 286,
    y: 610,
    icon: FileText,
    fallbackName: "결과지 에디터",
    fallbackRole: "검사 결과지 문구 작성과 수정",
  },
  {
    id: "operations_secretary",
    x: 592,
    y: 610,
    icon: CalendarClock,
    fallbackName: "운영비서",
    fallbackRole: "브리핑, 승인 요약, 자동화",
  },
];

const orgEdges: Array<[string, string]> = [
  ["crata_ceo", "concept_guardian"],
  ["crata_ceo", "business_designer"],
  ["crata_ceo", "counseling_coach"],
  ["concept_guardian", "relationship_analyst"],
  ["business_designer", "quality_inspector"],
  ["business_designer", "content_strategist"],
  ["counseling_coach", "case_learner"],
  ["quality_inspector", "report_editor"],
  ["quality_inspector", "operations_secretary"],
];

function statusLabel(status: string) {
  if (status === "working") return "working";
  if (status === "queued") return "queued";
  if (status === "waiting_approval") return "review";
  if (status === "planned") return "planned";
  return "live";
}

function getAgentColor(agent: AgentActivity | undefined, fallback = "#4FD1A5") {
  return agent?.color || fallback;
}

export function AgentOrgChart({ agents }: AgentOrgChartProps) {
  const [zoom, setZoom] = useState(0.78);
  const agentById = useMemo(
    () => new Map(agents.map((agent) => [agent.id, agent])),
    [agents],
  );

  function fitChart() {
    setZoom(0.78);
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#08090A] text-white">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.07] px-5 md:px-7">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            Agent Network
          </p>
          <h1 className="mt-0.5 text-lg font-semibold text-white">ORG CHART</h1>
        </div>
        <div className="hidden items-center gap-2 text-[11px] text-[var(--color-text-muted)] sm:flex">
          <span className="size-2 rounded-full bg-emerald-300" />
          {agents.filter((agent) => agent.enabled).length} live
        </div>
      </header>

      <div className="relative min-h-0 flex-1 overflow-auto">
        <div className="absolute right-5 top-5 z-20 flex flex-col gap-2">
          <button
            type="button"
            aria-label="조직도 확대"
            onClick={() => setZoom((value) => Math.min(1.2, value + 0.08))}
            className="flex size-9 items-center justify-center rounded-md border border-white/10 bg-[#141416] text-white shadow-lg hover:bg-white/[0.08]"
          >
            <Plus size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="조직도 축소"
            onClick={() => setZoom((value) => Math.max(0.58, value - 0.08))}
            className="flex size-9 items-center justify-center rounded-md border border-white/10 bg-[#141416] text-white shadow-lg hover:bg-white/[0.08]"
          >
            <Minus size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={fitChart}
            className="h-9 rounded-md border border-white/10 bg-[#141416] px-2 text-[11px] font-bold text-white shadow-lg hover:bg-white/[0.08]"
          >
            Fit
          </button>
        </div>

        <div className="flex min-h-full min-w-[1180px] items-center justify-center p-8">
          <div
            className="relative h-[770px] w-[1260px] origin-center rounded-lg border border-white/[0.07] bg-[#101112]"
            style={{ transform: `scale(${zoom})` }}
          >
            <svg className="absolute inset-0 h-full w-full" role="presentation">
              {orgEdges.map(([fromId, toId]) => {
                const from = orgNodes.find((node) => node.id === fromId);
                const to = orgNodes.find((node) => node.id === toId);
                if (!from || !to) return null;

                const startX = from.x + cardWidth / 2;
                const startY = from.y + cardHeight;
                const endX = to.x + cardWidth / 2;
                const endY = to.y;
                const midY = startY + (endY - startY) / 2;

                return (
                  <path
                    key={`${fromId}-${toId}`}
                    d={`M ${startX} ${startY} V ${midY} H ${endX} V ${endY}`}
                    fill="none"
                    stroke="rgba(255,255,255,0.12)"
                    strokeWidth="2"
                  />
                );
              })}
            </svg>

            {orgNodes.map((node) => {
              const agent = agentById.get(node.id);
              const Icon = node.icon;
              const color = getAgentColor(agent);

              return (
                <article
                  key={node.id}
                  className="absolute flex h-[104px] w-[228px] items-center gap-3 rounded-lg border border-white/[0.08] bg-[#18181A] px-4 shadow-[0_16px_50px_rgba(0,0,0,0.32)]"
                  style={{ left: node.x, top: node.y }}
                >
                  <div className="relative shrink-0">
                    <span
                      className="flex size-11 items-center justify-center rounded-full border border-white/10 text-white"
                      style={{ backgroundColor: `${color}33` }}
                    >
                      <Icon size={19} aria-hidden="true" />
                    </span>
                    <span
                      className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-[#18181A]"
                      style={{ backgroundColor: agent?.enabled === false ? "#71717A" : color }}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-sm font-bold text-white">
                      {agent?.display_name || node.fallbackName}
                    </h2>
                    <p className="mt-1 truncate text-[11px] font-medium text-[var(--color-text-secondary)]">
                      {agent?.role || node.fallbackRole}
                    </p>
                    <p className="mt-1 truncate text-[11px] text-[var(--color-text-muted)]">
                      {statusLabel(agent?.activity_status || "idle")} · CRATA
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

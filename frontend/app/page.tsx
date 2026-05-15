import {
  Activity,
  ArrowRight,
  Bot,
  CheckCircle2,
  ClipboardList,
  CircleDot,
  Clock3,
  FileText,
  GitBranch,
  Inbox,
  Network,
  Radar,
  Route,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { getAgentActivity, getDashboardSummary } from "@/lib/api";
import { agentSeeds } from "@/lib/agent-seeds";
import type { Agent, AgentActivity, AgentActivityStatus, DashboardSummary } from "@/lib/types";

const agents: Agent[] = agentSeeds.map((agent) => ({
  ...agent,
  default_model_provider: "openai",
  default_model_name: "gpt-4.1-mini",
  prompt: "",
}));

const plannedAgentCount = agents.filter((agent) => agent.status === "planned").length;
const fallbackSummary: DashboardSummary = {
  agent_count: agents.length,
  active_agent_count: agents.filter((agent) => agent.enabled).length,
  candidate_task_count: 0,
  running_task_count: 0,
  pending_approval_count: 0,
  artifact_count: 0,
};
const flowSteps = ["입력 접수", "후보 분리", "에이전트 실행", "승인대기"];
const activeStatusOrder: AgentActivityStatus[] = ["working", "waiting_approval", "queued", "idle", "planned"];

const activityTone: Record<
  AgentActivityStatus,
  { label: string; badge: string; dot: string; rail: string }
> = {
  working: {
    label: "작업 중",
    badge: "border-[#6EC28B]/35 bg-[#EAF5EE] text-[#1F6B57]",
    dot: "bg-[#2F7D4E]",
    rail: "bg-[#2F7D4E]",
  },
  waiting_approval: {
    label: "승인 대기",
    badge: "border-[#E7BF83]/45 bg-[#FFF4E3] text-[#8A5A1F]",
    dot: "bg-[#C9852B]",
    rail: "bg-[#C9852B]",
  },
  queued: {
    label: "후보 대기",
    badge: "border-[#8FB4D8]/40 bg-[#EDF5FC] text-[#28597F]",
    dot: "bg-[#34699A]",
    rail: "bg-[#34699A]",
  },
  idle: {
    label: "대기 중",
    badge: "border-[#CBD5CE] bg-[#F3F6F3] text-[#5F6B64]",
    dot: "bg-[#8B978F]",
    rail: "bg-[#8B978F]",
  },
  planned: {
    label: "확장 예정",
    badge: "border-[#D8DED8] bg-white text-[#6B746E]",
    dot: "bg-[#C9D0CA]",
    rail: "bg-[#C9D0CA]",
  },
};

function fallbackActivityFor(agent: Agent): AgentActivity {
  return {
    id: agent.id,
    display_name: agent.display_name,
    role: agent.role,
    color: agent.color,
    enabled: agent.enabled,
    status: agent.status,
    activity_status: agent.enabled ? "idle" : "planned",
    current_focus: agent.enabled ? "새 요청 대기" : "2차 확장 준비",
    current_task_title: null,
    current_task_type: null,
    workload_count: 0,
    pending_approval_count: 0,
    candidate_count: 0,
  };
}

const fallbackAgentActivity = agents.map(fallbackActivityFor);

async function loadDashboardData() {
  const [summaryResult, activityResult] = await Promise.allSettled([
    getDashboardSummary(),
    getAgentActivity(),
  ]);

  return {
    summary: summaryResult.status === "fulfilled" ? summaryResult.value : fallbackSummary,
    summaryUnavailable: summaryResult.status === "rejected",
    agentActivity:
      activityResult.status === "fulfilled" ? activityResult.value.agents : fallbackAgentActivity,
    activityUnavailable: activityResult.status === "rejected",
  };
}

export default async function HomePage() {
  const { summary, summaryUnavailable, agentActivity, activityUnavailable } = await loadDashboardData();

  return (
    <DashboardContent
      summary={summary}
      summaryUnavailable={summaryUnavailable}
      agentActivity={agentActivity}
      activityUnavailable={activityUnavailable}
    />
  );
}

export function DashboardContent({
  summary,
  summaryUnavailable = false,
  agentActivity = fallbackAgentActivity,
  activityUnavailable = false,
}: {
  summary: DashboardSummary;
  summaryUnavailable?: boolean;
  agentActivity?: AgentActivity[];
  activityUnavailable?: boolean;
}) {
  const orderedActivity = agents.map((agent) => {
    const activity = agentActivity.find((item) => item.id === agent.id);
    return activity ?? fallbackActivityFor(agent);
  });
  const activeAgents = agents.filter((agent) => agent.enabled);
  const focusAgent =
    orderedActivity
      .filter((agent) => agent.activity_status !== "idle" && agent.activity_status !== "planned")
      .sort(
        (left, right) =>
          activeStatusOrder.indexOf(left.activity_status) - activeStatusOrder.indexOf(right.activity_status),
      )[0] ?? orderedActivity[0];
  const operationStatus =
    summary.pending_approval_count > 0
      ? `${summary.pending_approval_count}개 승인 검토 필요`
      : summary.running_task_count > 0
        ? `${summary.running_task_count}개 작업 진행 중`
        : "대기 중";
  const activityCounts = {
    working: orderedActivity.filter((agent) => agent.activity_status === "working").length,
    waiting: orderedActivity.filter((agent) => agent.activity_status === "waiting_approval").length,
    queued: orderedActivity.filter((agent) => agent.activity_status === "queued").length,
    idle: orderedActivity.filter((agent) => agent.activity_status === "idle").length,
  };
  const workRails = [
    {
      label: "후보 정리",
      value: summary.candidate_task_count,
      helper: "요청 콘솔에서 분리된 실행 후보",
      icon: <Inbox size={18} aria-hidden="true" />,
      tone: "bg-primary",
    },
    {
      label: "에이전트 실행",
      value: summary.running_task_count,
      helper: "현재 실행 중인 에이전트 작업",
      icon: <Bot size={18} aria-hidden="true" />,
      tone: "bg-analysis",
    },
    {
      label: "승인 검토",
      value: summary.pending_approval_count,
      helper: "공식 반영 전 확인할 산출물",
      icon: <CheckCircle2 size={18} aria-hidden="true" />,
      tone: "bg-approval",
    },
    {
      label: "결과 보관",
      value: summary.artifact_count,
      helper: "생성된 작업 산출물",
      icon: <FileText size={18} aria-hidden="true" />,
      tone: "bg-success",
    },
  ];
  const recentSignals = [
    {
      label: "승인 검토",
      detail:
        summary.pending_approval_count > 0
          ? `${summary.pending_approval_count}개 항목이 청하님 판단을 기다립니다.`
          : "현재 승인 대기 항목은 없습니다.",
      href: "/approvals",
      action: "승인함 확인",
    },
    {
      label: "후보 정리",
      detail:
        summary.candidate_task_count > 0
          ? `${summary.candidate_task_count}개 후보가 기록되어 있습니다.`
          : "회의록이나 전사록을 넣으면 후보를 만들 수 있습니다.",
      href: "/request-intake",
      action: "요청 콘솔 열기",
    },
    {
      label: "직원 상태",
      detail: `${activeAgents.length}명은 운영 가능, ${plannedAgentCount}명은 확장 준비 중입니다.`,
      href: "/agents",
      action: "에이전트 보기",
    },
  ];

  return (
    <AppShell>
      <div className="space-y-5">
        <header className="overflow-hidden rounded-card border border-[#0F1713] bg-[#16211B] p-5 text-white shadow-panel">
          <div className="relative z-10 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-button bg-white/10 px-3 py-1.5 text-xs font-semibold text-[#C7DED4]">
                <Radar size={14} aria-hidden="true" />
                실시간 운영실
              </div>
              <h1 className="mt-4 text-3xl font-semibold">CRATA AI Office</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#D8DED8]">
                회의록과 상담 전사록에서 작업 후보를 분리하고, 직원별 실행 상태와 승인 흐름을 한 화면에서 추적합니다.
              </p>
            </div>
            <div className="grid min-w-64 gap-2 rounded-card border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-medium text-[#AFC5BB]">현재 초점</p>
              <p className="text-xl font-semibold">{operationStatus}</p>
              <div className="flex flex-wrap gap-2 pt-2">
                <Link
                  href="/request-intake"
                  className="inline-flex h-9 items-center gap-1.5 rounded-button bg-white px-3 text-xs font-semibold text-[#1F2723] transition hover:bg-[#EEF2EE]"
                >
                  요청 콘솔 열기
                  <ArrowRight size={14} aria-hidden="true" />
                </Link>
                <Link
                  href="/approvals"
                  className="inline-flex h-9 items-center gap-1.5 rounded-button border border-white/20 px-3 text-xs font-semibold text-white transition hover:bg-white/10"
                >
                  승인함 확인
                  <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </header>

        {summaryUnavailable || activityUnavailable ? (
          <section className="rounded-card border border-approval/40 bg-[#FFF8EC] p-4 text-sm text-[#7A5A2E]" role="status">
            백엔드 API와 연결할 수 없어 일부 값은 로컬 seed 기준으로 표시합니다.
          </section>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="운영 지표">
          <MetricCard label="활성 에이전트" value={summary.active_agent_count} icon={<Bot size={18} />} />
          <MetricCard label="준비중 에이전트" value={plannedAgentCount} icon={<Users size={18} />} />
          <MetricCard label="작업 후보" value={summary.candidate_task_count} icon={<ClipboardList size={18} />} />
          <MetricCard label="승인대기" value={summary.pending_approval_count} icon={<CircleDot size={18} />} />
        </section>

        <section className="rounded-card border border-[#CFD8D1] bg-[#101813] p-4 text-white shadow-panel" aria-label="에이전트 활동 맵">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-button bg-white/10 px-3 py-1.5 text-xs font-semibold text-[#C7DED4]">
                <Network size={14} aria-hidden="true" />
                에이전트 활동 맵
              </div>
              <h2 className="mt-3 text-xl font-semibold">각 직원이 지금 무엇을 하는지 보는 화면</h2>
              <p className="mt-1 text-sm leading-6 text-[#C9D5CD]">
                각 직원이 지금 어떤 작업을 맡고 있는지 카드와 흐름으로 봅니다.
              </p>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <ActivityPill label="작업 중" value={activityCounts.working} />
              <ActivityPill label="승인 대기" value={activityCounts.waiting} />
              <ActivityPill label="후보 대기" value={activityCounts.queued} />
              <ActivityPill label="대기" value={activityCounts.idle} />
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="rounded-card border border-white/10 bg-white/[0.06] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Activity size={16} aria-hidden="true" />
                활동 검사기
              </div>
              <div className="mt-4 rounded-card border border-white/10 bg-[#16211B] p-4">
                <p className="text-xs font-medium text-[#AFC5BB]">현재 포커스</p>
                <h3 className="mt-2 text-lg font-semibold">{focusAgent.display_name}</h3>
                <p className="mt-1 text-sm leading-6 text-[#D8DED8]">{focusAgent.role}</p>
                <div className="mt-4 flex items-center gap-2">
                  <span className={`size-2.5 rounded-full ${activityTone[focusAgent.activity_status].dot}`} />
                  <span
                    className={`rounded-button border px-2 py-1 text-xs font-semibold ${activityTone[focusAgent.activity_status].badge}`}
                  >
                    {activityTone[focusAgent.activity_status].label}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                  <MiniStat label="부하" value={focusAgent.workload_count} dark />
                  <MiniStat label="후보" value={focusAgent.candidate_count} dark />
                  <MiniStat label="승인" value={focusAgent.pending_approval_count} dark />
                </div>
              </div>
              <Link
                href={focusAgent.activity_status === "waiting_approval" ? "/approvals" : "/request-intake"}
                className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-button bg-white text-sm font-semibold text-[#16211B] transition hover:bg-[#EEF2EE]"
              >
                관련 화면 열기
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </aside>

            <div className="relative overflow-hidden rounded-card border border-white/10 bg-[#15211B] p-4">
              <div className="absolute left-5 right-5 top-[5.25rem] hidden h-px bg-white/10 xl:block" />
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {orderedActivity.map((agent, index) => {
                  const tone = activityTone[agent.activity_status];
                  return (
                    <article
                      key={agent.id}
                      className="relative rounded-card border border-white/10 bg-white/[0.07] p-3 shadow-[0_10px_28px_rgba(0,0,0,0.15)]"
                      style={{ borderTop: `3px solid ${agent.color}` }}
                    >
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-2 text-[11px] font-semibold text-[#C9D5CD]">
                          <span className={`size-2.5 rounded-full ${tone.dot}`} aria-hidden="true" />
                          {index === 0 ? "라우터" : `직원 ${index}`}
                        </span>
                        <span className={`rounded-button border px-2 py-1 text-[11px] font-semibold ${tone.badge}`}>
                          {tone.label}
                        </span>
                      </div>
                      <h3 className="truncate text-sm font-semibold">{agent.display_name}</h3>
                      <p className="mt-1 line-clamp-2 min-h-10 text-xs leading-5 text-[#B8C7BE]">{agent.role}</p>
                      <div className="mt-3 rounded-card bg-[#0F1713] p-3">
                        <p className="text-[11px] font-medium text-[#8FA198]">현재 포커스</p>
                        <p className="mt-1 line-clamp-2 min-h-10 text-xs leading-5 text-white">{agent.current_focus}</p>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <MiniStat label="부하" value={agent.workload_count} dark />
                        <MiniStat label="후보" value={agent.candidate_count} dark />
                        <MiniStat label="승인" value={agent.pending_approval_count} dark />
                      </div>
                      <div className={`mt-3 h-1 rounded-full ${tone.rail}`} />
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
          <div className="rounded-card border border-border bg-surface p-4 shadow-sm">
            <div className="flex flex-col gap-2 border-b border-border pb-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-base font-semibold text-[#1F2723]">작업 흐름 레일</h2>
                <p className="mt-1 text-xs leading-5 text-[#5F6B64]">
                  입력 접수부터 승인 검토까지 현재 병목을 숫자로 봅니다.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#5F6B64]">
                {flowSteps.map((step, index) => (
                  <span key={step} className="inline-flex items-center gap-2">
                    <span>{step}</span>
                    {index < flowSteps.length - 1 ? <span className="text-border">→</span> : null}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {workRails.map((rail) => (
                <article key={rail.label} className="rounded-card border border-border bg-surfaceAlt p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-[#1F2723]">{rail.label}</h3>
                      <p className="mt-1 text-xs leading-5 text-[#5F6B64]">{rail.helper}</p>
                    </div>
                    <span className={`flex size-9 shrink-0 items-center justify-center rounded-button text-white ${rail.tone}`}>
                      {rail.icon}
                    </span>
                  </div>
                  <div className="mt-4 flex items-end justify-between gap-3">
                    <p className="text-3xl font-semibold text-[#1F2723]">{rail.value}</p>
                    <div className="h-2 min-w-24 flex-1 overflow-hidden rounded-full bg-white">
                      <div
                        className={`h-full rounded-full ${rail.tone}`}
                        style={{ width: `${Math.min(100, Math.max(12, Number(rail.value) * 18))}%` }}
                      />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <aside className="space-y-4">
            <section className="rounded-card border border-border bg-surface p-4 shadow-sm">
              <h2 className="text-base font-semibold text-[#1F2723]">최근 신호</h2>
              <div className="mt-3 space-y-3">
                {recentSignals.map((signal) => (
                  <article key={signal.label} className="border-b border-border pb-3 last:border-b-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-[#1F2723]">{signal.label}</h3>
                        <p className="mt-1 text-xs leading-5 text-[#5F6B64]">{signal.detail}</p>
                      </div>
                      <Link href={signal.href} className="shrink-0 text-xs font-semibold text-primary">
                        {signal.action}
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </section>
            <section className="rounded-card border border-border bg-surface p-4 shadow-sm">
              <h2 className="text-base font-semibold text-[#1F2723]">운영 흐름</h2>
              <div className="mt-3 space-y-3 text-xs leading-5 text-[#5F6B64]">
                <div className="flex gap-2">
                  <Route size={15} className="mt-0.5 text-primary" aria-hidden="true" />
                  <p>요청 콘솔이 회의록과 전사록을 후보로 분해합니다.</p>
                </div>
                <div className="flex gap-2">
                  <GitBranch size={15} className="mt-0.5 text-analysis" aria-hidden="true" />
                  <p>CEO가 담당 직원을 묶고 에이전트 운영 그래프를 실행합니다.</p>
                </div>
                <div className="flex gap-2">
                  <Clock3 size={15} className="mt-0.5 text-approval" aria-hidden="true" />
                  <p>결과는 승인함에 멈추고, 승인된 내용만 공식 지식으로 반영합니다.</p>
                </div>
              </div>
            </section>
          </aside>
        </section>
      </div>
    </AppShell>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <section className="rounded-card border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-[#5F6B64]">{label}</p>
        <span className="text-primary" aria-hidden="true">
          {icon}
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold text-[#1F2723]">{value}</p>
    </section>
  );
}

function ActivityPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-button border border-white/10 bg-white/[0.06] px-3 py-2">
      <p className="text-lg font-semibold">{value}</p>
      <p className="mt-0.5 whitespace-nowrap text-[11px] text-[#C9D5CD]">{label}</p>
    </div>
  );
}

function MiniStat({ label, value, dark = false }: { label: string; value: number; dark?: boolean }) {
  return (
    <div className={dark ? "rounded-button bg-white/5 px-2 py-2 text-center" : "rounded-button bg-surfaceAlt px-2 py-2 text-center"}>
      <p className={dark ? "text-sm font-semibold text-white" : "text-sm font-semibold text-[#1F2723]"}>{value}</p>
      <p className={dark ? "mt-0.5 text-[11px] text-[#9CAEA4]" : "mt-0.5 text-[11px] text-[#5F6B64]"}>{label}</p>
    </div>
  );
}

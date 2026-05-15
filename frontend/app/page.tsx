import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ClipboardList,
  CircleDot,
  FileText,
  Inbox,
  Radar,
  Users,
} from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { getDashboardSummary } from "@/lib/api";
import { agentSeeds } from "@/lib/agent-seeds";
import type { Agent, DashboardSummary } from "@/lib/types";

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

async function loadDashboardSummary() {
  try {
    return { summary: await getDashboardSummary(), summaryUnavailable: false };
  } catch {
    return { summary: fallbackSummary, summaryUnavailable: true };
  }
}

export default async function HomePage() {
  const { summary, summaryUnavailable } = await loadDashboardSummary();

  return <DashboardContent summary={summary} summaryUnavailable={summaryUnavailable} />;
}

export function DashboardContent({
  summary,
  summaryUnavailable = false,
}: {
  summary: DashboardSummary;
  summaryUnavailable?: boolean;
}) {
  const activeAgents = agents.filter((agent) => agent.enabled);
  const operationStatus =
    summary.pending_approval_count > 0
      ? `${summary.pending_approval_count}개 승인 검토 필요`
      : summary.running_task_count > 0
        ? `${summary.running_task_count}개 작업 진행 중`
        : "대기 중";
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
          ? `${summary.pending_approval_count}개 항목이 판단을 기다립니다.`
          : "현재 승인 대기 항목은 없습니다.",
      href: "/approvals",
      action: "승인함 확인",
    },
    {
      label: "후보 정리",
      detail:
        summary.candidate_task_count > 0
          ? `${summary.candidate_task_count}개 후보가 기록되어 있습니다.`
          : "새 회의록이나 전사록을 넣어 후보를 만들 수 있습니다.",
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
        <header className="rounded-card border border-border bg-[#1F2723] p-5 text-white shadow-panel">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-button bg-white/10 px-3 py-1.5 text-xs font-semibold text-[#C7DED4]">
                <Radar size={14} aria-hidden="true" />
                실시간 운영실
              </div>
              <h1 className="mt-4 text-3xl font-semibold">CRATA AI Office</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#D8DED8]">
                회의록과 상담 전사록에서 작업 후보를 분리하고, 에이전트 실행과 승인 흐름을 한 화면에서 추적합니다.
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

        {summaryUnavailable ? (
          <section className="rounded-card border border-approval/40 bg-[#FFF8EC] p-4 text-sm text-[#7A5A2E]" role="status">
            백엔드 API에 연결할 수 없어 에이전트 수는 로컬 seed 기준으로 표시하고, 작업 후보와 승인대기 수는 임시값으로 표시합니다.
          </section>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="운영 지표">
          <section className="rounded-card border border-border bg-surface p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-[#5F6B64]">활성 에이전트</p>
              <Bot size={18} className="text-primary" aria-hidden="true" />
            </div>
            <p className="mt-3 text-2xl font-semibold text-[#1F2723]">{summary.active_agent_count}</p>
          </section>
          <section className="rounded-card border border-border bg-surface p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-[#5F6B64]">준비중 에이전트</p>
              <Users size={18} className="text-analysis" aria-hidden="true" />
            </div>
            <p className="mt-3 text-2xl font-semibold text-[#1F2723]">{plannedAgentCount}</p>
          </section>
          <section className="rounded-card border border-border bg-surface p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-[#5F6B64]">작업 후보</p>
              <ClipboardList size={18} className="text-[#5F6B64]" aria-hidden="true" />
            </div>
            <p className="mt-3 text-2xl font-semibold text-[#1F2723]">{summary.candidate_task_count}</p>
          </section>
          <section className="rounded-card border border-border bg-surface p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-[#5F6B64]">승인대기</p>
              <CircleDot size={18} className="text-approval" aria-hidden="true" />
            </div>
            <p className="mt-3 text-2xl font-semibold text-[#1F2723]">{summary.pending_approval_count}</p>
          </section>
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
              <h2 className="text-base font-semibold text-[#1F2723]">에이전트 워크룸</h2>
              <p className="mt-1 text-xs leading-5 text-[#5F6B64]">
                운영 가능한 직원과 확장 예정 직원을 같이 봅니다.
              </p>
              <div className="mt-3 grid gap-2">
                {agents.slice(0, 5).map((agent) => (
                  <div key={agent.id} className="flex items-center gap-3 rounded-button bg-surfaceAlt px-3 py-2">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: agent.color }}
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-[#1F2723]">{agent.display_name}</p>
                      <p className="truncate text-xs text-[#5F6B64]">{agent.enabled ? "운영 가능" : "확장 예정"}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </section>

        <section aria-label="에이전트 목록">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-[#1F2723]">전체 에이전트 현황</h2>
            <p className="text-xs font-medium text-[#5F6B64]">{agents.length}명 구성</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {agents.map((agent) => (
              <article
                key={agent.id}
                className="rounded-card border border-border bg-surface p-3 shadow-sm"
                style={{ borderTop: `3px solid ${agent.color}` }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-[#1F2723]">{agent.display_name}</h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#5F6B64]">{agent.role}</p>
                  </div>
                  <span className="shrink-0 rounded-button bg-surfaceAlt px-2 py-1 text-[11px] font-semibold text-[#5F6B64]">
                    {agent.enabled ? "대기" : "준비"}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

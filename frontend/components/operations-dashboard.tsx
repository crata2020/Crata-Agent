import {
  Activity,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  CircleDot,
  Clock3,
  FileText,
  Inbox,
  ListChecks,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";

import type { AgentActivity, DashboardSummary, WorkflowRunActivity } from "@/lib/types";

interface OperationsDashboardProps {
  summary: DashboardSummary;
  agents: AgentActivity[];
  workflowRuns: WorkflowRunActivity[];
}

type DashboardMetric = {
  label: string;
  value: string;
  sublabel: string;
  icon: typeof Users;
  tone: "green" | "blue" | "violet" | "amber" | "red" | "slate";
};

const toneClasses: Record<DashboardMetric["tone"], string> = {
  green: "border-emerald-400/15 bg-emerald-400/[0.07] text-emerald-200",
  blue: "border-sky-400/15 bg-sky-400/[0.07] text-sky-200",
  violet: "border-violet-400/15 bg-violet-400/[0.08] text-violet-200",
  amber: "border-amber-400/15 bg-amber-400/[0.08] text-amber-200",
  red: "border-rose-400/15 bg-rose-400/[0.08] text-rose-200",
  slate: "border-white/10 bg-white/[0.05] text-white",
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "시간 미정";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "시간 미정";

  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function statusLabel(status: string) {
  const normalized = status.toLowerCase();
  if (["completed", "done", "approved"].includes(normalized)) return "완료";
  if (["running", "working", "in_progress"].includes(normalized)) return "진행";
  if (["waiting_approval", "pending_approval", "reviewing"].includes(normalized)) return "검수";
  if (["failed", "error", "rejected"].includes(normalized)) return "주의";
  if (["queued", "planned"].includes(normalized)) return "대기";
  return status || "대기";
}

function percent(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((value / total) * 100));
}

export function OperationsDashboard({
  summary,
  agents,
  workflowRuns,
}: OperationsDashboardProps) {
  const enabledAgents = agents.filter((agent) => agent.enabled);
  const activeAgents = agents.filter((agent) =>
    ["working", "queued", "waiting_approval"].includes(agent.activity_status),
  );
  const pendingAgents = agents.filter((agent) => agent.pending_approval_count > 0);
  const recentRuns = workflowRuns.slice(0, 5);
  const projectUpdates = agents
    .flatMap((agent) =>
      agent.work_items.map((item) => ({
        ...item,
        agentName: agent.display_name,
        agentColor: agent.color,
      })),
    )
    .slice(0, 6);

  const metrics: DashboardMetric[] = [
    {
      label: "총 에이전트",
      value: formatNumber(summary.agent_count),
      sublabel: `${formatNumber(enabledAgents.length)}명 활성`,
      icon: Users,
      tone: "blue",
    },
    {
      label: "활성 구간",
      value: formatNumber(summary.active_agent_count),
      sublabel: "작업 가능한 운영 인원",
      icon: Bot,
      tone: "green",
    },
    {
      label: "작업 후보",
      value: formatNumber(summary.candidate_task_count),
      sublabel: "회의록에서 추출된 항목",
      icon: ListChecks,
      tone: "violet",
    },
    {
      label: "오늘 실행",
      value: formatNumber(summary.running_task_count),
      sublabel: "워크플로우 진행 중",
      icon: Zap,
      tone: "amber",
    },
    {
      label: "승인 대기",
      value: formatNumber(summary.pending_approval_count),
      sublabel: "사람 검토 필요",
      icon: ShieldCheck,
      tone: summary.pending_approval_count > 0 ? "red" : "green",
    },
    {
      label: "산출물",
      value: formatNumber(summary.artifact_count),
      sublabel: "생성된 결과물",
      icon: FileText,
      tone: "slate",
    },
  ];

  const candidateProgress = percent(summary.running_task_count, summary.candidate_task_count);
  const approvalProgress = percent(
    Math.max(summary.artifact_count - summary.pending_approval_count, 0),
    Math.max(summary.artifact_count, 1),
  );

  return (
    <div className="h-full overflow-y-auto bg-[#08090A] text-white">
      <header className="sticky top-0 z-20 border-b border-white/[0.07] bg-[#08090A]/92 px-5 py-3 backdrop-blur md:px-7">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              CRATA OS
            </p>
            <h1 className="mt-1 text-xl font-semibold text-white">대시보드</h1>
            <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
              CRATA 운영 현황을 한눈에 확인합니다.
            </p>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <Link
              href="/request-intake"
              className="inline-flex h-8 items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-white hover:bg-white/[0.08]"
            >
              <Inbox size={14} aria-hidden="true" />
              새 요청
            </Link>
            <Link
              href="/office"
              className="inline-flex h-8 items-center gap-2 rounded-md border border-emerald-400/20 bg-emerald-400/[0.08] px-3 text-xs font-semibold text-emerald-200 hover:bg-emerald-400/[0.13]"
            >
              <Sparkles size={14} aria-hidden="true" />
              오피스 보기
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-3 px-4 py-4 md:px-6">
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          {metrics.map((metric) => {
            const Icon = metric.icon;

            return (
              <article
                key={metric.label}
                className="rounded-lg border border-white/[0.08] bg-[#141416] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.22)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-medium text-[var(--color-text-secondary)]">
                      {metric.label}
                    </p>
                    <p className="mt-2 text-2xl font-semibold leading-none text-white">{metric.value}</p>
                  </div>
                  <span className={`flex size-8 items-center justify-center rounded-md border ${toneClasses[metric.tone]}`}>
                    <Icon size={16} aria-hidden="true" />
                  </span>
                </div>
                <p className="mt-3 truncate text-[11px] text-[var(--color-text-muted)]">{metric.sublabel}</p>
              </article>
            );
          })}
        </section>

        <section className="grid gap-3 xl:grid-cols-[1.15fr_0.95fr]">
          <article className="rounded-lg border border-white/[0.08] bg-[#141416] p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-white">
                <Activity size={15} className="text-emerald-300" aria-hidden="true" />
                오늘 요약
              </h2>
              <span className="text-[11px] text-[var(--color-text-muted)]">운영 기준</span>
            </div>

            <div className="space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="text-[var(--color-text-secondary)]">태스크 진행</span>
                  <span className="font-medium text-white">{candidateProgress}% 진행</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full bg-emerald-300" style={{ width: `${candidateProgress}%` }} />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="text-[var(--color-text-secondary)]">승인 처리</span>
                  <span className="font-medium text-white">{approvalProgress}% 정리</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full bg-sky-300" style={{ width: `${approvalProgress}%` }} />
                </div>
              </div>

              <div className="grid gap-2 pt-1 sm:grid-cols-3">
                <SummaryChip label="작업 중" value={activeAgents.length} />
                <SummaryChip label="검수 대기" value={pendingAgents.length} />
                <SummaryChip label="대기 가능" value={Math.max(enabledAgents.length - activeAgents.length, 0)} />
              </div>
            </div>
          </article>

          <article className="rounded-lg border border-white/[0.08] bg-[#141416] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-white">
                <Zap size={15} className="text-amber-300" aria-hidden="true" />
                최근 활동
              </h2>
              <Link href="/activity" className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-200">
                전체 보기
                <ArrowUpRight size={12} aria-hidden="true" />
              </Link>
            </div>

            <div className="space-y-2">
              {recentRuns.length > 0 ? (
                recentRuns.map((run) => (
                  <div key={run.id} className="flex items-start gap-3 border-b border-white/[0.06] pb-2 last:border-b-0 last:pb-0">
                    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-amber-400/[0.10] text-amber-200">
                      <CircleDot size={13} aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-xs font-semibold text-white">
                          {run.task_title || run.workflow_type}
                        </p>
                        <span className="shrink-0 rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] font-medium text-[var(--color-text-secondary)]">
                          {statusLabel(run.status)}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-[11px] text-[var(--color-text-muted)]">
                        {run.current_step || "다음 단계 대기"} · {formatDate(run.started_at)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyRow icon={Clock3} text="아직 표시할 실행 기록이 없습니다." />
              )}
            </div>
          </article>
        </section>

        <section className="grid gap-3 xl:grid-cols-[1fr_0.92fr]">
          <article className="rounded-lg border border-white/[0.08] bg-[#141416] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-white">
                <ListChecks size={15} className="text-emerald-300" aria-hidden="true" />
                프로젝트 업데이트
              </h2>
              <Link href="/map" className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-200">
                태스크 보기
                <ArrowUpRight size={12} aria-hidden="true" />
              </Link>
            </div>

            <div className="space-y-2">
              {projectUpdates.length > 0 ? (
                projectUpdates.map((item) => (
                  <Link
                    key={`${item.source_type}-${item.id}`}
                    href={item.href}
                    className="group flex items-start gap-3 border-b border-white/[0.06] pb-2 last:border-b-0 last:pb-0"
                  >
                    <span
                      className="mt-1 size-2.5 shrink-0 rounded-sm"
                      style={{ backgroundColor: item.agentColor }}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-white group-hover:text-emerald-200">
                        {item.title}
                      </span>
                      <span className="mt-1 block truncate text-[11px] text-[var(--color-text-muted)]">
                        {item.agentName} · {statusLabel(item.status)} · {item.summary}
                      </span>
                    </span>
                  </Link>
                ))
              ) : (
                <EmptyRow icon={CheckCircle2} text="새 요청을 넣으면 여기에서 후보 작업과 업데이트가 쌓입니다." />
              )}
            </div>
          </article>

          <article className="rounded-lg border border-white/[0.08] bg-[#141416] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-white">
                <Users size={15} className="text-violet-300" aria-hidden="true" />
                에이전트 상태
              </h2>
              <Link href="/org-chart" className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-200">
                조직도
                <ArrowUpRight size={12} aria-hidden="true" />
              </Link>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {agents.slice(0, 8).map((agent) => (
                <div key={agent.id} className="flex items-center gap-3 rounded-md border border-white/[0.06] bg-white/[0.025] px-3 py-2">
                  <span
                    className="flex size-7 shrink-0 items-center justify-center rounded-md text-[11px] font-bold text-white"
                    style={{ backgroundColor: agent.color }}
                  >
                    {agent.display_name.slice(0, 1)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-white">{agent.display_name}</p>
                    <p className="mt-0.5 truncate text-[11px] text-[var(--color-text-muted)]">
                      {statusLabel(agent.activity_status)} · {agent.workload_count}개 업무
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}

function SummaryChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-white/[0.07] bg-white/[0.025] px-3 py-2">
      <p className="text-[11px] text-[var(--color-text-muted)]">{label}</p>
      <p className="mt-1 text-lg font-semibold leading-none text-white">{formatNumber(value)}</p>
    </div>
  );
}

function EmptyRow({ icon: Icon, text }: { icon: typeof Clock3; text: string }) {
  return (
    <div className="flex min-h-[86px] items-center gap-3 rounded-md border border-dashed border-white/[0.10] px-3 text-[12px] text-[var(--color-text-muted)]">
      <Icon size={16} className="text-[var(--color-text-secondary)]" aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}

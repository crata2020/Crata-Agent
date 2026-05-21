
import { getWorkflowActivity } from "@/lib/api";
import { agentSeeds } from "@/lib/agent-seeds";
import { taskTypeLabel } from "@/lib/task-labels";
import type { WorkflowRunActivity, WorkflowStepActivity } from "@/lib/types";
import Link from "next/link";

const stepLabels: Record<string, string> = {
  ceo_routing: "CEO 라우팅",
  context_retrieval: "컨텍스트 수집",
  question_gate: "질문/답변 확인",
  specialist_draft: "전문가 초안",
  draft_generation: "초안 생성",
  artifact_creation: "산출물 저장",
  approval_pending: "승인 대기",
  concept_guardian: "개념 검수",
  quality_review: "품질 검수",
};

const statusLabels: Record<string, string> = {
  completed: "완료",
  running: "실행 중",
  pending_approval: "승인 대기",
  failed: "실패",
  queued: "대기",
};

const agentNameById = new Map(agentSeeds.map((agent) => [agent.id, agent.display_name]));
const fallbackWorkflowRuns: WorkflowRunActivity[] = [];

type ActivityPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

async function loadActivityData() {
  const result = await Promise.allSettled([getWorkflowActivity()]);
  const workflowResult = result[0];

  return {
    workflowRuns:
      workflowResult.status === "fulfilled" ? workflowResult.value.runs : fallbackWorkflowRuns,
    dataUnavailable: workflowResult.status === "rejected",
  };
}

export default async function ActivityPage({ searchParams }: ActivityPageProps = {}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const highlightedTaskId = firstParam(resolvedSearchParams.taskId);
  const highlightedRunId = firstParam(resolvedSearchParams.runId);
  const highlightedAgentId = firstParam(resolvedSearchParams.agentId);
  const { workflowRuns, dataUnavailable } = await loadActivityData();

  return (
    <ActivityContent
      workflowRuns={workflowRuns}
      dataUnavailable={dataUnavailable}
      highlightedTaskId={highlightedTaskId}
      highlightedRunId={highlightedRunId}
      highlightedAgentId={highlightedAgentId}
    />
  );
}

export function ActivityContent({
  workflowRuns,
  dataUnavailable,
  highlightedTaskId,
  highlightedRunId,
  highlightedAgentId,
}: {
  workflowRuns: WorkflowRunActivity[];
  dataUnavailable: boolean;
  highlightedTaskId?: string;
  highlightedRunId?: string;
  highlightedAgentId?: string;
}) {
  const visibleWorkflowRuns = workflowRuns.filter((run) => {
    if (highlightedTaskId && run.task_id !== highlightedTaskId) {
      return false;
    }

    if (highlightedRunId && run.id !== highlightedRunId) {
      return false;
    }

    if (highlightedAgentId && !run.steps.some((step) => step.agent_id === highlightedAgentId)) {
      return false;
    }

    return true;
  });
  const completedStepCount = visibleWorkflowRuns.reduce(
    (count, run) => count + run.steps.filter((step) => step.status === "completed").length,
    0,
  );
  const approvalCount = visibleWorkflowRuns.filter((run) => run.status === "pending_approval").length;
  const hasActiveFilter = Boolean(highlightedTaskId || highlightedRunId || highlightedAgentId);
  const hasHighlightedResult = Boolean(hasActiveFilter && visibleWorkflowRuns.length > 0);
  const missingHighlightedResult = Boolean(hasActiveFilter && visibleWorkflowRuns.length === 0);
  const highlightedAgentName = highlightedAgentId
    ? agentNameById.get(highlightedAgentId) ?? highlightedAgentId
    : null;
  const activeFilterLabels = [
    highlightedTaskId ? `작업 ${shortId(highlightedTaskId)}` : null,
    highlightedRunId ? `실행 ${shortId(highlightedRunId)}` : null,
    highlightedAgentName ? `에이전트 ${highlightedAgentName}` : null,
  ].filter(Boolean);
  const fallbackFocusedTaskId = highlightedAgentId ? visibleWorkflowRuns[0]?.task_id ?? undefined : undefined;
  const highlightedMapHref = mapHref({
    taskId: highlightedTaskId ?? fallbackFocusedTaskId,
    agentId: highlightedAgentId,
  });

  return (
    <>
      <section className="flex min-h-[calc(100vh-1rem)] flex-col overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] text-white">
        <header className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <div>
            <h1 className="text-xl font-semibold tracking-[-0.02em] text-white">활동 로그</h1>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              {visibleWorkflowRuns.length}개 실행 · {approvalCount}개 승인 대기
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-button border border-[var(--color-border)] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)]">
              실시간 로그 열기
            </span>
            <span className="text-xs text-[var(--color-text-muted)]">방금 업데이트</span>
            <span className="text-sm text-[#77777F]">↻</span>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <ActivityStat label="실행 기록" value={visibleWorkflowRuns.length} />
            <ActivityStat label="완료 단계" value={completedStepCount} />
            <ActivityStat label="승인 대기" value={approvalCount} tone="approval" />
          </div>

          {hasHighlightedResult ? (
            <section className="mt-3 flex flex-col gap-3 rounded-button border border-[var(--color-info)]/20 bg-[var(--color-info-soft)] px-3 py-2 text-sm text-[var(--color-text)] md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium text-[var(--color-info)]">선택한 실행 흐름을 표시합니다.</p>
                <p className="mt-0.5 text-xs text-[#AEB9C4]">
                  {activeFilterLabels.join(" · ")} 기준으로 활동 로그를 좁혀서 보여줍니다.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {highlightedMapHref ? (
                  <Link
                    href={highlightedMapHref}
                    className="rounded-button border border-[var(--color-info)]/20 bg-[var(--color-info-soft)] px-3 py-1.5 text-xs font-medium text-[var(--color-info)] transition hover:bg-[var(--color-info-soft)]"
                  >
                    {highlightedTaskId ? "운영 맵에서 흐름 보기" : "운영 맵에서 에이전트 보기"}
                  </Link>
                ) : null}
                <Link
                  href="/activity"
                  className="rounded-button border border-[var(--color-border)] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-[var(--color-text)] transition hover:bg-white/[0.06]"
                >
                  전체 로그 보기
                </Link>
              </div>
            </section>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-[var(--color-accent-soft)] px-3 py-1 text-xs font-medium text-[var(--color-accent)]">전체 {visibleWorkflowRuns.length}</span>
            <span className="rounded-md bg-white/[0.04] px-3 py-1 text-xs font-medium text-[var(--color-text-secondary)]">대기 {approvalCount}</span>
            <span className="rounded-md bg-white/[0.04] px-3 py-1 text-xs font-medium text-[var(--color-text-secondary)]">단계 {completedStepCount}</span>
            {activeFilterLabels.map((label) => (
              <span key={label} className="rounded-full bg-[#0B2535] px-3 py-1.5 text-xs font-bold text-[#7DD7FF]">
                {label}
              </span>
            ))}
            {dataUnavailable ? (
              <span className="rounded-full bg-[#302410] px-3 py-1.5 text-xs font-bold text-[#FFD37A]">
                백엔드 연결 불안정
              </span>
            ) : null}
          </div>

          <section className="mt-3 grid gap-3">
            {visibleWorkflowRuns.length > 0 ? (
              visibleWorkflowRuns.map((run, index) => (
                <WorkflowRunCard
                  key={run.id}
                  run={run}
                  index={index + 1}
                  highlightedAgentId={highlightedAgentId}
                />
              ))
            ) : missingHighlightedResult ? (
              <div className="rounded-[10px] border border-[#F2B84B]/30 bg-[#241C0F] p-4 text-sm leading-6 text-[#FFD37A]">
                선택한 실행 흐름을 찾지 못했습니다. 필터를 해제하거나 운영 맵에서 다른 에이전트를 선택해 주세요.
              </div>
            ) : (
              <div className="rounded-[10px] border border-white/10 bg-[#202024] p-4 text-sm leading-6 text-[#C7D2DC]">
                아직 실행된 워크플로우가 없습니다. 요청 콘솔에서 후보를 실행하면 이곳에 단계별 로그가 쌓입니다.
              </div>
            )}
          </section>
        </div>
      </section>
    </>
  );
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function WorkflowRunCard({
  run,
  index,
  highlightedAgentId,
}: {
  run: WorkflowRunActivity;
  index: number;
  highlightedAgentId?: string;
}) {
  const completedSteps = run.steps.filter((step) => step.status === "completed").length;
  const totalSteps = run.steps.length;
  const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  const primaryAgentId =
    highlightedAgentId ??
    run.steps.find((step) => step.agent_id && step.agent_id !== "crata_ceo")?.agent_id ??
    run.steps[0]?.agent_id;
  const runMapHref = mapHref({ taskId: run.task_id ?? undefined, agentId: primaryAgentId ?? undefined }) ?? "/map";
  const shouldOpenSteps = Boolean(highlightedAgentId) || run.status === "failed";

  return (
    <article className="overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface-raised)]">
      <div className="flex flex-col gap-2 border-b border-[var(--color-border)] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-7 shrink-0 items-center justify-center rounded-md bg-[var(--color-warning-soft)] px-2 text-[10px] font-medium text-[var(--color-warning)]">
            실행 {index}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-[4px] bg-[#0B4EA2] px-2 py-0.5 text-[10px] font-black text-[#7BB6FF]">
                {taskTypeLabel(run.task_type ?? run.workflow_type)}
              </span>
              <span className="text-[11px] font-semibold text-[#8F8F98]">
                {statusLabels[run.status] ?? run.status}
              </span>
              <span className="text-[11px] font-semibold text-[#66666E]">
                현재 단계: {stepLabels[run.current_step] ?? run.current_step}
              </span>
              {run.graph_name ? (
                <span className="rounded-[4px] bg-[#102A1C] px-2 py-0.5 text-[10px] font-black text-[#6FF0A0]">
                  {run.graph_name}
                </span>
              ) : null}
            </div>
            <h2 className="mt-1 truncate text-sm font-semibold text-white">
              {run.task_title ?? "제목 없는 작업"}
            </h2>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs font-medium text-[#77777F]">{formatDateTime(run.started_at)}</p>
          <p className="mt-1 text-[11px] font-bold text-[#B8C4CE]">
            {completedSteps}/{totalSteps || 0} 단계 · {progress}%
          </p>
          <Link
            href={runMapHref}
            className="mt-2 inline-flex rounded-button border border-[var(--color-accent)]/20 bg-[var(--color-accent-soft)] px-2 py-1 text-[10px] font-medium text-[var(--color-accent)] transition hover:bg-[var(--color-accent-soft)]"
          >
            운영 맵에서 보기
          </Link>
        </div>
      </div>

      <div className="border-b border-[var(--color-border)] bg-black/20 px-4 py-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-[11px] font-medium text-[var(--color-text-muted)]">단계 흐름</p>
          <p className="text-[11px] text-[var(--color-text-muted)]">왼쪽에서 오른쪽 순서로 실행됩니다.</p>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {run.steps.length > 0 ? (
            run.steps.map((step, stepIndex) => (
              <div key={step.id} className="flex shrink-0 items-center gap-2">
                  {stepIndex > 0 ? <span className="h-px w-7 bg-white/15" /> : null}
                <span
                  title={`${agentNameById.get(step.agent_id ?? "") ?? step.agent_id ?? "시스템"} · ${stepLabels[step.step_name] ?? step.step_name}`}
                  aria-label={`${stepIndex + 1}단계 ${stepLabels[step.step_name] ?? step.step_name}`}
                  className={`flex h-8 min-w-[52px] items-center justify-center rounded-[8px] border px-2 text-[10px] font-black ${stepPipelineClass(step.status)}`}
                >
                  {stepShortLabel(step.step_name)}
                </span>
              </div>
            ))
          ) : (
            <span className="rounded-[7px] border border-dashed border-white/10 px-3 py-2 text-xs font-semibold text-[#77777F]">
              단계 기록 없음
            </span>
          )}
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.04]">
          <div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${progress}%` }} />
        </div>
        {run.node_trace?.length ? <GraphNodeSummary run={run} /> : null}
      </div>

      <details open={shouldOpenSteps} className="bg-black/20">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 border-b border-white/10 px-4 py-2.5 text-xs font-bold text-[#AEB9C4] [&::-webkit-details-marker]:hidden">
          <span>단계 로그 {run.steps.length}개</span>
          <span className="rounded-full bg-white/[0.07] px-2 py-0.5 text-[10px] text-[#DDE6EE]">
            {shouldOpenSteps ? "자동 펼침" : "필요 시 펼치기"}
          </span>
        </summary>
        <ol className="space-y-1.5 p-3">
          {run.steps.map((step) => (
            <WorkflowStepCard
              key={step.id}
              step={step}
              taskId={run.task_id}
              highlightedAgentId={highlightedAgentId}
            />
          ))}
        </ol>
      </details>
    </article>
  );
}

function stepPipelineClass(status: string) {
  switch (status) {
    case "completed":
      return "border-[var(--color-accent)]/30 bg-[var(--color-accent-soft)] text-[var(--color-accent)]";
    case "failed":
      return "border-[var(--color-danger)]/30 bg-[var(--color-danger-soft)] text-[var(--color-danger)]";
    case "running":
      return "border-[var(--color-info)]/30 bg-[var(--color-info-soft)] text-[var(--color-info)]";
    default:
      return "border-[var(--color-border)] bg-white/[0.03] text-[var(--color-text-secondary)]";
  }
}

function GraphNodeSummary({ run }: { run: WorkflowRunActivity }) {
  const nodes = run.node_trace ?? [];
  const completedNodes = nodes.filter((node) => node.status === "completed").length;
  const lastNode = nodes.at(-1);

  return (
    <details className="mt-2 rounded-[7px] border border-white/10 bg-black/20">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-2.5 py-1.5 text-[11px] font-bold text-[#8EA0AE] [&::-webkit-details-marker]:hidden">
        <span>
          내부 처리 {completedNodes}/{nodes.length} 완료
          {lastNode ? ` · 마지막 단계 ${stepLabels[lastNode.name] ?? lastNode.name}` : ""}
        </span>
        <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-[#DDE6EE]">기술 노드</span>
      </summary>
      <div className="border-t border-white/10 px-2.5 py-2">
        <div className="flex flex-wrap gap-1.5">
          {nodes.map((node, index) => (
            <span
              key={`${node.name}-${index}`}
              className="rounded-[5px] border border-white/10 bg-[#151519] px-2 py-0.5 text-[10px] font-semibold text-[#AEB9C4]"
              title={node.summary}
            >
              {stepLabels[node.name] ?? node.name}
            </span>
          ))}
        </div>
      </div>
    </details>
  );
}

function stepShortLabel(stepName: string) {
  const labels: Record<string, string> = {
    ceo_routing: "CEO",
    context_retrieval: "지식",
    question_gate: "질문",
    specialist_draft: "초안",
    draft_generation: "생성",
    artifact_creation: "저장",
    approval_pending: "승인",
    concept_guardian: "개념",
    quality_review: "검수",
  };

  return labels[stepName] ?? stepName.slice(0, 4);
}

function WorkflowStepCard({
  step,
  taskId,
  highlightedAgentId,
}: {
  step: WorkflowStepActivity;
  taskId?: string | null;
  highlightedAgentId?: string;
}) {
  const agentName = step.agent_id ? agentNameById.get(step.agent_id) ?? step.agent_id : "시스템";
  const isHighlightedAgent = Boolean(highlightedAgentId && step.agent_id === highlightedAgentId);
  const stepMapHref = step.agent_id
    ? mapHref({ taskId: taskId ?? undefined, agentId: step.agent_id }) ?? "/map"
    : null;

  return (
    <li
      className={`grid gap-2 rounded-[7px] border px-3 py-2.5 md:grid-cols-[8px_120px_112px_minmax(0,1fr)_96px] md:items-center md:gap-3 ${
        isHighlightedAgent
          ? "border-[#38BDF8]/45 bg-[#0B2535]/65"
          : "border-white/10 bg-[#18181B]"
      }`}
    >
      <span className={`size-2 rounded-full ${step.status === "failed" ? "bg-[#FF5F6D]" : "bg-[#36D47F]"}`} />
      <span className="text-xs font-semibold text-[#8F8F98] md:truncate">{formatDateTime(step.completed_at ?? step.started_at)}</span>
      {step.agent_id ? (
        <Link
          href={stepMapHref ?? "/map"}
          className="text-xs font-bold text-[#67D4FF] transition hover:text-white md:truncate"
        >
          {agentName}
        </Link>
      ) : (
        <span className="text-xs font-bold text-[#67D4FF] md:truncate">{agentName}</span>
      )}
      <div className="min-w-0">
          <p className="text-sm font-semibold text-white md:truncate">
            {stepLabels[step.step_name] ?? step.step_name}
          </p>
          <p className="mt-0.5 text-xs leading-5 text-[#AFAFB7] md:truncate">{stepDisplaySummary(step)}</p>
      </div>
      <div className="flex items-center gap-1.5 md:justify-end">
        <span className="w-fit rounded-full bg-[#2A2A2E] px-2 py-1 text-center text-[10px] font-bold text-[#AEB9C4] md:w-auto">
          {statusLabels[step.status] ?? step.status}
        </span>
        {step.agent_id ? (
          <Link
            href={stepMapHref ?? "/map"}
            className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-1 text-[10px] font-bold text-[#DDE6EE] transition hover:bg-white/10"
          >
            맵
          </Link>
        ) : null}
      </div>
    </li>
  );
}

function ActivityStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "approval";
}) {
  const valueClass = tone === "approval" ? "text-[#F2B84B]" : "text-white";

  return (
    <div className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-3">
      <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${valueClass}`}>{value}</p>
    </div>
  );
}

function stepDisplaySummary(step: WorkflowStepActivity) {
  const output = step.output_summary.trim();
  const normalizedOutput = output.toLowerCase();

  if (!output || normalizedOutput === step.status.toLowerCase() || normalizedOutput in statusLabels) {
    return step.input_summary || `${statusLabels[step.status] ?? step.status} 상태입니다.`;
  }

  return output;
}

function shortId(value: string) {
  return value.length > 12 ? `${value.slice(0, 8)}…` : value;
}

function mapHref({ taskId, agentId }: { taskId?: string; agentId?: string }) {
  const params = new URLSearchParams();
  if (taskId) {
    params.set("taskId", taskId);
  }
  if (agentId) {
    params.set("agentId", agentId);
  }

  const query = params.toString();
  return query ? `/map?${query}` : null;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

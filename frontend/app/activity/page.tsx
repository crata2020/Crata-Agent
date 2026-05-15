import { AppShell } from "@/components/app-shell";
import { getWorkflowActivity } from "@/lib/api";
import { agentSeeds } from "@/lib/agent-seeds";
import type { WorkflowRunActivity, WorkflowStepActivity } from "@/lib/types";

const stepLabels: Record<string, string> = {
  ceo_routing: "CEO 라우팅",
  context_retrieval: "컨텍스트 수집",
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

async function loadActivityData() {
  const result = await Promise.allSettled([getWorkflowActivity()]);
  const workflowResult = result[0];

  return {
    workflowRuns:
      workflowResult.status === "fulfilled" ? workflowResult.value.runs : fallbackWorkflowRuns,
    dataUnavailable: workflowResult.status === "rejected",
  };
}

export default async function ActivityPage() {
  const { workflowRuns, dataUnavailable } = await loadActivityData();

  return <ActivityContent workflowRuns={workflowRuns} dataUnavailable={dataUnavailable} />;
}

export function ActivityContent({
  workflowRuns,
  dataUnavailable,
}: {
  workflowRuns: WorkflowRunActivity[];
  dataUnavailable: boolean;
}) {
  const completedStepCount = workflowRuns.reduce(
    (count, run) => count + run.steps.filter((step) => step.status === "completed").length,
    0,
  );
  const approvalCount = workflowRuns.filter((run) => run.status === "pending_approval").length;

  return (
    <AppShell>
      <section className="min-h-[calc(100vh-2rem)] rounded-[18px] border border-white/10 bg-[#05080B] p-5 text-white shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[#8EA0AE]">
              Workflow Activity
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-white">활동 로그</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#B7C2CC]">
              Agent Operation Graph가 실행한 작업과 단계별 담당 에이전트를 시간순으로 확인합니다.
            </p>
          </div>
          {dataUnavailable ? (
            <div className="rounded-[10px] border border-[#F2B84B]/40 bg-[#2A2113]/80 px-4 py-2 text-xs font-semibold text-[#F2B84B]">
              백엔드 연결이 불안정해서 활동 로그를 불러오지 못했습니다.
            </div>
          ) : null}
        </header>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <ActivityStat label="실행 기록" value={workflowRuns.length} />
          <ActivityStat label="완료 단계" value={completedStepCount} />
          <ActivityStat label="승인 대기" value={approvalCount} tone="approval" />
        </div>

        <div className="mt-5 space-y-4">
          {workflowRuns.length > 0 ? (
            workflowRuns.map((run) => <WorkflowRunCard key={run.id} run={run} />)
          ) : (
            <div className="rounded-[14px] border border-white/10 bg-[#111820] p-6 text-sm leading-6 text-[#C7D2DC]">
              아직 실행된 워크플로우가 없습니다. 요청 콘솔에서 후보를 실행하면 이곳에 단계별 로그가 쌓입니다.
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}

function WorkflowRunCard({ run }: { run: WorkflowRunActivity }) {
  return (
    <article className="rounded-[16px] border border-white/10 bg-[#111820]/95 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#38BDF8]/12 px-2.5 py-1 text-xs font-semibold text-[#67D4FF]">
              {run.task_type ?? run.workflow_type}
            </span>
            <span className="rounded-full bg-white/[0.07] px-2.5 py-1 text-xs font-semibold text-[#AEB9C4]">
              {statusLabels[run.status] ?? run.status}
            </span>
          </div>
          <h2 className="mt-3 text-lg font-semibold text-white">
            {run.task_title ?? "제목 없는 작업"}
          </h2>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#6F7C88]">
            현재 단계: {stepLabels[run.current_step] ?? run.current_step}
          </p>
        </div>
        <p className="shrink-0 text-xs font-medium text-[#8F98A3]">{formatDateTime(run.started_at)}</p>
      </div>

      <ol className="mt-4 grid gap-3 xl:grid-cols-2">
        {run.steps.map((step) => (
          <WorkflowStepCard key={step.id} step={step} />
        ))}
      </ol>
    </article>
  );
}

function WorkflowStepCard({ step }: { step: WorkflowStepActivity }) {
  const agentName = step.agent_id ? agentNameById.get(step.agent_id) ?? step.agent_id : "시스템";

  return (
    <li className="rounded-[12px] border border-white/10 bg-black/22 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">
            {stepLabels[step.step_name] ?? step.step_name}
          </p>
          <p className="mt-1 text-xs font-semibold text-[#67D4FF]">{agentName}</p>
        </div>
        <span className="shrink-0 rounded-full bg-white/[0.07] px-2 py-1 text-[11px] font-semibold text-[#AEB9C4]">
          {statusLabels[step.status] ?? step.status}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-[#C7D2DC]">{stepDisplaySummary(step)}</p>
      <p className="mt-3 text-xs text-[#7D8792]">
        {formatDateTime(step.completed_at ?? step.started_at)}
      </p>
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
    <div className="rounded-[12px] border border-white/10 bg-[#111820] p-4">
      <p className="text-xs font-semibold text-[#AEB9C4]">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${valueClass}`}>{value}</p>
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

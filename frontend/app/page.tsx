import { AgentFlowCanvas } from "@/components/agent-flow-canvas";
import { AppShell } from "@/components/app-shell";
import { getAgentActivity, getDashboardSummary, getWorkflowActivity } from "@/lib/api";
import { agentSeeds } from "@/lib/agent-seeds";
import type { Agent, AgentActivity, DashboardSummary, WorkflowRunActivity } from "@/lib/types";

const agents: Agent[] = agentSeeds.map((agent) => ({
  ...agent,
  default_model_provider: "openai",
  default_model_name: "gpt-4.1-mini",
  prompt: "",
}));

const fallbackSummary: DashboardSummary = {
  agent_count: agents.length,
  active_agent_count: agents.filter((agent) => agent.enabled).length,
  candidate_task_count: 0,
  running_task_count: 0,
  pending_approval_count: 0,
  artifact_count: 0,
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
    work_items: [],
  };
}

const fallbackAgentActivity = agents.map(fallbackActivityFor);
const fallbackWorkflowActivity: WorkflowRunActivity[] = [];

async function loadDashboardData() {
  const [summaryResult, activityResult, workflowResult] = await Promise.allSettled([
    getDashboardSummary(),
    getAgentActivity(),
    getWorkflowActivity(),
  ]);

  return {
    summary: summaryResult.status === "fulfilled" ? summaryResult.value : fallbackSummary,
    agentActivity:
      activityResult.status === "fulfilled" ? activityResult.value.agents : fallbackAgentActivity,
    workflowActivity:
      workflowResult.status === "fulfilled" ? workflowResult.value.runs : fallbackWorkflowActivity,
    dataUnavailable:
      summaryResult.status === "rejected" ||
      activityResult.status === "rejected" ||
      workflowResult.status === "rejected",
  };
}

export default async function HomePage() {
  const { summary, agentActivity, workflowActivity, dataUnavailable } = await loadDashboardData();

  return (
    <DashboardContent
      summary={summary}
      agentActivity={agentActivity}
      workflowActivity={workflowActivity}
      dataUnavailable={dataUnavailable}
    />
  );
}

export function DashboardContent({
  summary,
  agentActivity = fallbackAgentActivity,
  workflowActivity = fallbackWorkflowActivity,
  dataUnavailable = false,
}: {
  summary: DashboardSummary;
  agentActivity?: AgentActivity[];
  workflowActivity?: WorkflowRunActivity[];
  dataUnavailable?: boolean;
}) {
  const orderedActivity = agents.map((agent) => {
    const activity = agentActivity.find((item) => item.id === agent.id);
    return activity ?? fallbackActivityFor(agent);
  });

  return (
    <AppShell>
      <div className="relative">
        {dataUnavailable ? (
          <div className="absolute left-5 top-5 z-30 rounded-button border border-[#F2B84B]/40 bg-[#2A2113]/90 px-4 py-2 text-xs font-semibold text-[#F2B84B]">
            백엔드 연결이 불안정해서 일부 값은 로컬 기준으로 표시합니다.
          </div>
        ) : null}
        <AgentFlowCanvas agents={orderedActivity} summary={summary} workflowRuns={workflowActivity} />
      </div>
    </AppShell>
  );
}

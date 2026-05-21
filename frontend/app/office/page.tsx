import { AgentFlowCanvas } from "@/components/agent-flow-canvas";
import { getAgentActivity, getDashboardSummary, getWorkflowActivity } from "@/lib/api";
import { agentSeeds } from "@/lib/agent-seeds";
import type { AgentActivity, DashboardSummary } from "@/lib/types";

const fallbackSummary: DashboardSummary = {
  agent_count: agentSeeds.length,
  active_agent_count: agentSeeds.filter((a) => a.enabled).length,
  candidate_task_count: 0,
  running_task_count: 0,
  pending_approval_count: 0,
  artifact_count: 0,
};

const fallbackAgents: AgentActivity[] = agentSeeds.map((seed) => ({
  id: seed.id,
  display_name: seed.display_name,
  role: seed.role,
  color: seed.color,
  enabled: seed.enabled,
  status: seed.status,
  activity_status: seed.enabled ? "idle" : "planned",
  current_focus: seed.enabled
    ? "새 요청을 기다리는 중입니다."
    : "2차 확장 예정 에이전트입니다.",
  current_task_title: null,
  current_task_type: null,
  workload_count: 0,
  pending_approval_count: 0,
  candidate_count: 0,
  work_items: [],
}));

export default async function OfficePage() {
  const [summaryRes, agentRes, workflowRes] = await Promise.allSettled([
    getDashboardSummary(),
    getAgentActivity(),
    getWorkflowActivity(),
  ]);

  const summary = summaryRes.status === "fulfilled" ? summaryRes.value : fallbackSummary;
  const agents = agentRes.status === "fulfilled" ? agentRes.value.agents : fallbackAgents;
  const runs = workflowRes.status === "fulfilled" ? workflowRes.value.runs : [];

  return <AgentFlowCanvas agents={agents} summary={summary} workflowRuns={runs} />;
}

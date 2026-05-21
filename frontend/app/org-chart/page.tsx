import { AgentOrgChart } from "@/components/agent-org-chart";
import { getAgentActivity } from "@/lib/api";
import { agentSeeds } from "@/lib/agent-seeds";
import type { AgentActivity } from "@/lib/types";

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

export default async function OrgChartPage() {
  const agentRes = await Promise.allSettled([getAgentActivity()]);
  const agents = agentRes[0].status === "fulfilled" ? agentRes[0].value.agents : fallbackAgents;

  return <AgentOrgChart agents={agents} />;
}

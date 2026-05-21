import { RequestFlowMap } from "@/components/request-flow-map";
import { getDashboardSummary, getRequestMap } from "@/lib/api";
import { agentSeeds } from "@/lib/agent-seeds";
import type { DashboardSummary, RequestMapItem } from "@/lib/types";

const fallbackSummary: DashboardSummary = {
  agent_count: agentSeeds.length,
  active_agent_count: agentSeeds.filter((a) => a.enabled).length,
  candidate_task_count: 0,
  running_task_count: 0,
  pending_approval_count: 0,
  artifact_count: 0,
};

type MapPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function MapPage({ searchParams }: MapPageProps = {}) {
  const p = searchParams ? await searchParams : {};
  const focus = {
    requestId: firstParam(p.requestId),
    taskId: firstParam(p.taskId),
    candidateId: firstParam(p.candidateId),
    agentId: firstParam(p.agentId),
  };

  const [summaryRes, mapRes] = await Promise.allSettled([
    getDashboardSummary(),
    getRequestMap(focus),
  ]);

  const summary = summaryRes.status === "fulfilled" ? summaryRes.value : fallbackSummary;
  const items: RequestMapItem[] = mapRes.status === "fulfilled" ? mapRes.value.items : [];
  const unavailable = summaryRes.status === "rejected" || mapRes.status === "rejected";

  return (
    <div className="relative h-full">
      {unavailable && (
        <div className="absolute left-5 top-5 z-30 rounded-xl border border-[var(--color-warning)]/40 bg-[#2A2113]/90 px-4 py-2 text-xs font-semibold text-[var(--color-warning)]">
          백엔드 연결이 불안정합니다.
        </div>
      )}
      <RequestFlowMap
        items={items}
        summary={summary}
        focusTaskId={focus.taskId}
        focusCandidateId={focus.candidateId}
        focusAgentId={focus.agentId}
      />
    </div>
  );
}

import { Bot, ClipboardList, CircleDot, Users } from "lucide-react";

import { AgentCard } from "@/components/agent-card";
import { AppShell } from "@/components/app-shell";
import { MetricCard } from "@/components/metric-card";
import { agentSeeds } from "@/lib/agent-seeds";
import type { Agent } from "@/lib/types";

const agents: Agent[] = agentSeeds.map((agent) => ({
  ...agent,
  default_model_provider: "openai",
  default_model_name: "gpt-4.1-mini",
  prompt: "",
}));

const activeAgentCount = agents.filter((agent) => agent.enabled).length;
const plannedAgentCount = agents.filter((agent) => agent.status === "planned").length;
const flowSteps = ["입력 접수", "후보 분리", "에이전트 실행", "승인대기"];

export default function HomePage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex flex-col gap-3 border-b border-border pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#1F2723]">CRATA AI Office</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5F6B64]">
              회의록과 상담 전사록에서 작업 후보를 분리하고, 에이전트 실행과 승인 흐름을 관리합니다.
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-button border border-border bg-surface px-3 py-2 text-xs font-medium text-[#5F6B64]">
            <CircleDot size={14} className="text-primary" aria-hidden="true" />
            로컬 운영 모드
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="운영 지표">
          <MetricCard label="활성 에이전트" value={activeAgentCount} tone="primary" icon={<Bot size={18} aria-hidden="true" />} />
          <MetricCard label="준비중 에이전트" value={plannedAgentCount} tone="analysis" icon={<Users size={18} aria-hidden="true" />} />
          <MetricCard label="작업 후보" value={0} icon={<ClipboardList size={18} aria-hidden="true" />} />
          <MetricCard label="승인대기" value={0} tone="approval" icon={<CircleDot size={18} aria-hidden="true" />} />
        </section>

        <section className="rounded-card border border-border bg-surface p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#1F2723]">AI Office 상태판</h2>
              <p className="mt-1 text-xs leading-5 text-[#5F6B64]">현재 1차 MVP 에이전트는 대기 중이며, 확장 에이전트는 준비 상태입니다.</p>
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
        </section>

        <section aria-label="에이전트 목록">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-[#1F2723]">에이전트</h2>
            <p className="text-xs font-medium text-[#5F6B64]">{agents.length}명 구성</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

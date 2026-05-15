import { AgentCard } from "@/components/agent-card";
import { AppShell } from "@/components/app-shell";
import { agentSeeds } from "@/lib/agent-seeds";
import type { Agent } from "@/lib/types";

const agents: Agent[] = agentSeeds.map((agent) => ({
  ...agent,
  default_model_provider: "openai",
  default_model_name: "gpt-4.1-mini",
  prompt: "",
}));

export default function AgentsPage() {
  return (
    <AppShell>
      <div className="space-y-5">
        <header className="border-b border-border pb-5">
          <h1 className="text-2xl font-semibold text-[#1F2723]">에이전트</h1>
          <p className="mt-2 text-sm leading-6 text-[#5F6B64]">
            현재 활성 에이전트와 다음 확장 예정 에이전트를 확인합니다.
          </p>
        </header>

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

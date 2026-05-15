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
      <section className="min-h-[calc(100vh-2rem)] rounded-[18px] border border-white/10 bg-[#05080B] p-5 text-white shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <header className="border-b border-white/10 pb-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[#8EA0AE]">Agents</p>
          <h1 className="mt-2 text-2xl font-semibold text-white">에이전트</h1>
          <p className="mt-2 text-sm leading-6 text-[#B7C2CC]">
            현재 활성 에이전트와 다음 확장 예정 에이전트를 확인합니다.
          </p>
        </header>

        <section className="mt-5" aria-label="에이전트 목록">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-white">에이전트</h2>
            <p className="text-xs font-medium text-[#AEB9C4]">{agents.length}명 구성</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </section>
      </section>
    </AppShell>
  );
}

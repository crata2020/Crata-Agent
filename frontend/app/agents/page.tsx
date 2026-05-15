import { AgentCard } from "@/components/agent-card";
import { AppShell } from "@/components/app-shell";
import { agentOperatingGuides } from "@/lib/agent-operating-guides";
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

        <section className="mt-6" aria-label="전문 작업 절차">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-white">전문 작업 절차</h2>
              <p className="mt-1 text-xs leading-5 text-[#AEB9C4]">
                각 에이전트가 바로 답을 쓰기 전에 확인해야 하는 질문과 검수 흐름입니다.
              </p>
            </div>
            <p className="text-xs font-medium text-[#AEB9C4]">{agentOperatingGuides.length}개 절차</p>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {agentOperatingGuides.map((guide) => {
              const agent = agents.find((item) => item.id === guide.agentId);

              return (
                <article
                  key={guide.agentId}
                  className="rounded-[14px] border border-white/10 bg-[#111820]/92 p-4 shadow-[0_18px_42px_rgba(0,0,0,0.22)]"
                  style={{ borderLeft: `4px solid ${agent?.color ?? "#38BDF8"}` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-white">{guide.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-[#C7D2DC]">{guide.summary}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-white/[0.07] px-2 py-1 text-xs font-semibold text-[#AEB9C4]">
                      {agent?.display_name ?? guide.agentId}
                    </span>
                  </div>
                  <ol className="mt-3 grid gap-2 text-xs leading-5 text-[#DDE6EE] sm:grid-cols-2">
                    {guide.steps.map((step, index) => (
                      <li key={step} className="flex gap-2 rounded-[10px] border border-white/10 bg-black/20 px-3 py-2">
                        <span className="font-semibold text-[#7DD7FF]">{index + 1}</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </article>
              );
            })}
          </div>
        </section>
      </section>
    </AppShell>
  );
}

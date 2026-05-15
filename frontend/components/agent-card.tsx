import { Bot, CircleDot } from "lucide-react";

import { StatusPill } from "@/components/status-pill";
import type { Agent } from "@/lib/types";

interface AgentCardProps {
  agent: Agent;
}

export function AgentCard({ agent }: AgentCardProps) {
  const isPlanned = agent.status === "planned" || !agent.enabled;

  return (
    <article
      className="relative flex min-h-32 flex-col justify-between rounded-card border border-white/10 bg-[#111820] p-4 shadow-[0_18px_42px_rgba(0,0,0,0.25)]"
      style={{ borderLeft: `4px solid ${agent.color}` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-button bg-white/[0.06]"
            style={{ color: agent.color }}
            aria-hidden="true"
          >
            <Bot size={18} strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-white">{agent.display_name}</h3>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#AEB9C4]">{agent.role}</p>
          </div>
        </div>
        <StatusPill status={agent.status} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 text-xs text-[#AEB9C4]">
        <span className="truncate font-medium text-[#E8EEF2]">{agent.name}</span>
        <span className="inline-flex shrink-0 items-center gap-1">
          <CircleDot size={12} aria-hidden="true" />
          {isPlanned ? "준비 예정" : "운영 가능"}
        </span>
      </div>
    </article>
  );
}

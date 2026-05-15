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
      className="relative flex min-h-32 flex-col justify-between rounded-card border border-border bg-surface p-4 shadow-sm"
      style={{ borderLeft: `4px solid ${agent.color}` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-button bg-surfaceAlt"
            style={{ color: agent.color }}
            aria-hidden="true"
          >
            <Bot size={18} strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-[#1F2723]">{agent.display_name}</h3>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#5F6B64]">{agent.role}</p>
          </div>
        </div>
        <StatusPill status={agent.status} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 text-xs text-[#5F6B64]">
        <span className="truncate font-medium text-[#1F2723]">{agent.name}</span>
        <span className="inline-flex shrink-0 items-center gap-1">
          <CircleDot size={12} aria-hidden="true" />
          {isPlanned ? "준비 예정" : "운영 가능"}
        </span>
      </div>
    </article>
  );
}

import { statusColors } from "@/lib/design-tokens";
import type { AgentStatus } from "@/lib/types";

const statusLabels: Record<AgentStatus, string> = {
  idle: "대기",
  working: "작업중",
  reviewing: "검토중",
  waiting_for_approval: "승인대기",
  approved: "승인됨",
  rejected: "거절됨",
  error: "오류",
  disabled: "비활성",
  planned: "준비중",
};

const darkTextStatuses = new Set<AgentStatus>(["disabled", "planned"]);

interface StatusPillProps {
  status: AgentStatus;
}

export function StatusPill({ status }: StatusPillProps) {
  return (
    <span
      className="inline-flex h-6 items-center rounded-button px-2 text-xs font-semibold"
      style={{
        backgroundColor: statusColors[status],
        color: darkTextStatuses.has(status) ? "#1F2723" : "#FFFFFF",
      }}
    >
      {statusLabels[status]}
    </span>
  );
}

import { describe, expect, it } from "vitest";

import { statusColors } from "@/lib/design-tokens";
import type { Agent, Approval, DashboardSummary } from "./types";

describe("frontend shared tokens and API types", () => {
  it("defines status colors for planned office agent states", () => {
    expect(Object.keys(statusColors).sort()).toEqual([
      "approved",
      "disabled",
      "error",
      "idle",
      "planned",
      "rejected",
      "reviewing",
      "waiting_for_approval",
      "working",
    ]);
    expect(statusColors.waiting_for_approval).toBe("#C9852B");
  });

  it("supports backend-shaped records used by the dashboard", () => {
    const agent: Agent = {
      id: "agent-1",
      name: "strategy",
      display_name: "전략 에이전트",
      role: "planner",
      description: "Plans local office work.",
      status: "idle",
      default_model_provider: "openai",
      default_model_name: "gpt-4.1-mini",
      prompt: "",
      enabled: true,
      color: "#1F6B57",
    };
    const approval: Approval = {
      id: "approval-1",
      task_id: "task-1",
      artifact_id: "artifact-1",
      approval_type: "content_change",
      title: "승인 요청",
      summary: "변경 요약",
      status: "waiting_for_approval",
      before_content: "before",
      after_content: "after",
      affected_area: "dashboard",
      reviewer_note: "",
    };
    const summary: DashboardSummary = {
      agent_count: 1,
      active_agent_count: 1,
      candidate_task_count: 0,
      running_task_count: 0,
      pending_approval_count: 1,
      artifact_count: 1,
    };

    expect(agent.status).toBe("idle");
    expect(approval.task_id).toBe("task-1");
    expect(summary.pending_approval_count).toBe(1);
  });
});

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DashboardContent } from "@/app/page";
import { agentSeeds } from "@/lib/agent-seeds";
import type { DashboardSummary } from "@/lib/types";
import sharedAgentSeeds from "../../shared/agent-seeds.json";

describe("dashboard static agents", () => {
  const summary: DashboardSummary = {
    agent_count: 10,
    active_agent_count: 7,
    candidate_task_count: 4,
    running_task_count: 0,
    pending_approval_count: 2,
    artifact_count: 1,
  };

  it("uses the shared agent seed source", () => {
    expect(agentSeeds).toEqual(sharedAgentSeeds);
  });

  it("renders agent display names and roles from the shared seeds", () => {
    render(<DashboardContent summary={summary} />);

    for (const agent of sharedAgentSeeds) {
      expect(screen.getAllByText(agent.display_name).length).toBeGreaterThan(0);
      expect(screen.getByText(agent.role)).toBeInTheDocument();
    }
  });

  it("renders live dashboard summary counts", () => {
    render(<DashboardContent summary={summary} />);

    expect(screen.getByText("작업 후보")).toBeInTheDocument();
    expect(screen.getAllByText("승인대기").length).toBeGreaterThan(0);
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });
});

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AgentsPage from "@/app/agents/page";
import { agentSeeds } from "@/lib/agent-seeds";

describe("AgentsPage", () => {
  it("renders all 10 shared agent seeds", () => {
    expect(agentSeeds).toHaveLength(10);

    render(<AgentsPage />);

    for (const agent of agentSeeds) {
      expect(screen.getAllByText(agent.display_name).length).toBeGreaterThan(0);
    }
  });
});

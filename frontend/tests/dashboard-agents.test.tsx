import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "@/app/page";
import { agentSeeds } from "@/lib/agent-seeds";
import sharedAgentSeeds from "../../shared/agent-seeds.json";

describe("dashboard static agents", () => {
  it("uses the shared agent seed source", () => {
    expect(agentSeeds).toEqual(sharedAgentSeeds);
  });

  it("renders agent display names and roles from the shared seeds", () => {
    render(<HomePage />);

    for (const agent of sharedAgentSeeds) {
      expect(screen.getAllByText(agent.display_name).length).toBeGreaterThan(0);
      expect(screen.getByText(agent.role)).toBeInTheDocument();
    }
  });
});

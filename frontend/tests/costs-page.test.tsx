import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import CostsPage from "@/app/costs/page";

describe("CostsPage", () => {
  it("renders the local-first cost board", () => {
    render(<CostsPage />);

    expect(screen.getByRole("heading", { name: "비용", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "외부 LLM API" })).toBeInTheDocument();
    expect(screen.getByText("클라우드 인프라 (DB)")).toBeInTheDocument();
    expect(screen.getByText("추적 준비")).toBeInTheDocument();
  });
});

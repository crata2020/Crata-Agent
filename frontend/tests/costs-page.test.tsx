import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import CostsPage from "@/app/costs/page";

describe("CostsPage", () => {
  it("renders the local-first cost board", () => {
    render(<CostsPage />);

    expect(screen.getByRole("heading", { name: "비용", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "로컬 모델" })).toBeInTheDocument();
    expect(screen.getByText("외부 LLM API")).toBeInTheDocument();
    expect(screen.getByText("Docker DB")).toBeInTheDocument();
    expect(screen.getByText("현재 MVP 기준")).toBeInTheDocument();
  });
});

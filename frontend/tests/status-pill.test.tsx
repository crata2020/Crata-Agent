import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatusPill } from "@/components/status-pill";

describe("StatusPill", () => {
  it("renders the Korean label for a working status", () => {
    render(<StatusPill status="working" />);

    expect(screen.getByText("작업중")).toBeInTheDocument();
  });

  it("keeps short Korean labels on one line", () => {
    render(<StatusPill status="idle" />);

    expect(screen.getByText("대기")).toHaveClass("whitespace-nowrap");
  });
});

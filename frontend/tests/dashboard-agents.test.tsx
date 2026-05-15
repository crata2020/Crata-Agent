import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "@/app/page";

describe("dashboard static agents", () => {
  it("renders seed-aligned concept guardian role text", () => {
    render(<HomePage />);

    expect(screen.getByText("공식 지식과 개념 일관성 검토")).toBeInTheDocument();
  });
});

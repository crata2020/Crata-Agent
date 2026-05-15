import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppShell } from "@/components/app-shell";

describe("AppShell", () => {
  it("renders primary navigation labels in Korean", () => {
    render(
      <AppShell>
        <div>본문</div>
      </AppShell>,
    );

    expect(screen.getByRole("link", { name: "운영 맵" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "요청 콘솔" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "승인함" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "에이전트" })).toBeInTheDocument();

    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
    expect(screen.queryByText("Request Console")).not.toBeInTheDocument();
    expect(screen.queryByText("Approval Inbox")).not.toBeInTheDocument();
    expect(screen.queryByText("Agents")).not.toBeInTheDocument();
  });
});

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { AppShell } from "@/components/app-shell";

describe("AppShell", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

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
    expect(screen.getByRole("link", { name: "활동 로그" })).toHaveAttribute("href", "/activity");
    expect(screen.getByRole("link", { name: "메모리" })).toHaveAttribute("href", "/memory");

    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
    expect(screen.queryByText("Request Console")).not.toBeInTheDocument();
    expect(screen.queryByText("Approval Inbox")).not.toBeInTheDocument();
    expect(screen.queryByText("Agents")).not.toBeInTheDocument();
  });

  it("can hide and reopen the left sidebar", () => {
    render(
      <AppShell>
        <div>본문</div>
      </AppShell>,
    );

    fireEvent.click(screen.getByRole("button", { name: "왼쪽 바 숨기기" }));

    expect(screen.queryByRole("link", { name: "운영 맵" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "왼쪽 바 열기" })).toBeInTheDocument();
    expect(window.localStorage.getItem("crata-sidebar-visible")).toBe("false");

    fireEvent.click(screen.getByRole("button", { name: "왼쪽 바 열기" }));

    expect(screen.getByRole("link", { name: "운영 맵" })).toBeInTheDocument();
    expect(window.localStorage.getItem("crata-sidebar-visible")).toBe("true");
  });
});

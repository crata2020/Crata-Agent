import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppShell } from "@/components/app-shell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

describe("AppShell", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders the CRATA OS navigation groups", () => {
    render(
      <AppShell>
        <div>본문</div>
      </AppShell>,
    );

    expect(screen.getByRole("link", { name: "대시보드" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "새 요청" })).toHaveAttribute("href", "/request-intake");
    expect(screen.getByRole("link", { name: "인박스" })).toHaveAttribute("href", "/approvals");
    expect(screen.getByRole("link", { name: "태스크" })).toHaveAttribute("href", "/map");
    expect(screen.getByRole("link", { name: "에이전트 오피스" })).toHaveAttribute("href", "/office");
    expect(screen.getByRole("link", { name: "조직도" })).toHaveAttribute("href", "/org-chart");
    expect(screen.getByRole("link", { name: "지식·검사" })).toHaveAttribute("href", "/memory");

    expect(screen.getByText("운영")).toBeInTheDocument();
    expect(screen.getByText("작업")).toBeInTheDocument();
    expect(screen.getAllByText("에이전트").length).toBeGreaterThan(0);
    expect(screen.getByText("지식")).toBeInTheDocument();
  });

  it("can hide and reopen the left sidebar", () => {
    render(
      <AppShell>
        <div>본문</div>
      </AppShell>,
    );

    fireEvent.click(screen.getByRole("button", { name: "사이드바 접기" }));

    expect(screen.queryByRole("link", { name: "대시보드" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "사이드바 열기" })).toBeInTheDocument();
    expect(window.localStorage.getItem("crata-sidebar-collapsed")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "사이드바 열기" }));

    expect(screen.getByRole("link", { name: "대시보드" })).toBeInTheDocument();
    expect(window.localStorage.getItem("crata-sidebar-collapsed")).toBe("false");
  });

  it("filters sidebar navigation with the menu search", () => {
    render(
      <AppShell>
        <div>본문</div>
      </AppShell>,
    );

    fireEvent.change(screen.getByLabelText("메뉴 검색"), { target: { value: "조직" } });

    expect(screen.getByRole("link", { name: "조직도" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "새 요청" })).not.toBeInTheDocument();
  });
});

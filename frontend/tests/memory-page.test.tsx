import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import MemoryPage from "@/app/memory/page";

describe("MemoryPage", () => {
  it("renders the local CRATA knowledge index", async () => {
    render(await MemoryPage());

    expect(screen.getByRole("heading", { name: "메모리", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "공식 지식" })).toBeInTheDocument();
    expect(screen.getByText("개인행동 동기검사 MASTER")).toBeInTheDocument();
    expect(screen.getByText("집단행동검사 MASTER")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "에이전트 가이드" })).toBeInTheDocument();
  });
});

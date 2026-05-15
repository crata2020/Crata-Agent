import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MemoryBrowser, type MemoryEntry } from "@/components/memory-browser";

describe("MemoryBrowser", () => {
  const entries: MemoryEntry[] = [
    {
      title: "개인행동 동기검사 MASTER",
      path: "knowledge/official/personal-behavior-motivation/MASTER.md",
      description: "개인의 행동이 어디서 시작되는지 정리합니다.",
      kind: "official",
    },
    {
      title: "집단행동검사 MASTER",
      path: "knowledge/official/group-behavior/MASTER.md",
      description: "또래나 동료 집단 안에서의 행동을 정리합니다.",
      kind: "official",
    },
    {
      title: "CRATA 에이전트 작업 가이드",
      path: "knowledge/agent-guides/agent-operating-guides.md",
      description: "각 에이전트의 전문 작업 절차입니다.",
      kind: "guide",
    },
  ];

  it("filters knowledge entries by search text and kind", () => {
    render(<MemoryBrowser entries={entries} />);

    expect(screen.getByText("개인행동 동기검사 MASTER")).toBeInTheDocument();
    expect(screen.getByText("집단행동검사 MASTER")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("지식 검색"), { target: { value: "집단" } });

    expect(screen.queryByText("개인행동 동기검사 MASTER")).not.toBeInTheDocument();
    expect(screen.getByText("집단행동검사 MASTER")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("지식 검색"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "에이전트 가이드" }));

    expect(screen.queryByText("집단행동검사 MASTER")).not.toBeInTheDocument();
    expect(screen.getByText("CRATA 에이전트 작업 가이드")).toBeInTheDocument();
  });
});

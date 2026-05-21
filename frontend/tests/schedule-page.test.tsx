import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import SchedulePage from "@/app/schedule/page";

describe("SchedulePage", () => {
  it("renders the local office routine plan", () => {
    render(<SchedulePage />);

    expect(screen.getByRole("heading", { name: "스케줄", level: 1 })).toBeInTheDocument();
    expect(screen.getAllByText("데일리 승인 점검").length).toBeGreaterThan(0);
    expect(screen.getAllByText("지식 반영 후보 검토").length).toBeGreaterThan(0);
    expect(screen.getAllByText("콘텐츠 브리핑").length).toBeGreaterThan(0);
    expect(screen.getByText("수동 실행 4개")).toBeInTheDocument();
    expect(screen.getByText("추가 루틴 요약")).toBeInTheDocument();
  });
});

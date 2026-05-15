import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import SchedulePage from "@/app/schedule/page";

describe("SchedulePage", () => {
  it("renders the local office routine plan", () => {
    render(<SchedulePage />);

    expect(screen.getByRole("heading", { name: "스케줄", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("데일리 승인 점검")).toBeInTheDocument();
    expect(screen.getByText("지식 반영 후보 검토")).toBeInTheDocument();
    expect(screen.getByText("콘텐츠 브리핑")).toBeInTheDocument();
    expect(screen.getAllByText("수동 실행")).toHaveLength(4);
  });
});

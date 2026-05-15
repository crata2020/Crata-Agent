import { describe, expect, it } from "vitest";

import { detectInputType, inputTypeLabels, resolveInputType } from "@/lib/intake-input-type";

describe("intake input type detection", () => {
  it("detects counseling transcripts from speaker labels", () => {
    expect(
      detectInputType(
        "상담 기록",
        "상담자: 오늘 어떤 부분이 가장 힘드셨나요?\n내담자: 남편이 침묵하면 불안해서 계속 확인하게 됩니다.",
      ),
    ).toBe("transcript");
  });

  it("detects meeting notes from the title and agenda language", () => {
    expect(
      detectInputType("5월 운영 회의록", "안건: 결과지 문구 수정\n결정사항: 제안서 기획을 진행한다."),
    ).toBe("meeting_notes");
  });

  it("falls back to memo when no stronger signal exists", () => {
    expect(detectInputType("아이디어", "나중에 검토할 내용을 짧게 적어둔다.")).toBe("memo");
  });

  it("resolves auto mode to the detected type and manual mode to the selected override", () => {
    expect(resolveInputType("auto", "상담 기록", "상담자: 질문\n내담자: 답변")).toBe("transcript");
    expect(resolveInputType("memo", "상담 기록", "상담자: 질문\n내담자: 답변")).toBe("memo");
  });

  it("provides Korean labels for display", () => {
    expect(inputTypeLabels.auto).toBe("자동 감지");
    expect(inputTypeLabels.meeting_notes).toBe("회의록");
    expect(inputTypeLabels.transcript).toBe("상담 전사록");
    expect(inputTypeLabels.memo).toBe("메모");
  });
});

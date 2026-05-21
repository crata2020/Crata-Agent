import { describe, expect, it } from "vitest";

import {
  getAssistantAnswerContent,
  shouldShowApprovalControls,
} from "@/lib/chat-response";

describe("chat response presentation", () => {
  it("removes internal workflow sections from assistant answers", () => {
    const content = [
      "# 일반 에이전트 작업 후보",
      "",
      "## 작업 유형",
      "general_agent_task",
      "",
      "## 작업 정리",
      "입력 요청을 기준으로 필요한 에이전트 절차와 공식 지식을 확인한다.",
      "",
      "## 답변",
      "집단검사는 여러 사람이 함께 있는 장면에서 의사결정 방식과 상호작용 흐름을 이해하기 위한 검사입니다.",
      "",
      "## 검수 메모",
      "승인대기함에서 검토가 필요하다.",
      "",
      "## 참조한 컨텍스트 요약",
      "knowledge/official/group-behavior/MASTER.md ...",
    ].join("\n");

    expect(getAssistantAnswerContent(content)).toBe(
      "## 답변\n집단검사는 여러 사람이 함께 있는 장면에서 의사결정 방식과 상호작용 흐름을 이해하기 위한 검사입니다.",
    );
  });

  it("hides approval controls for general chat answers", () => {
    expect(shouldShowApprovalControls("general_agent_task")).toBe(false);
    expect(shouldShowApprovalControls("report_phrase_revision")).toBe(true);
  });
});

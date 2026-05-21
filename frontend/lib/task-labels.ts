export const taskTypeLabels: Record<string, string> = {
  report_phrase_revision: "결과지 문구 수정",
  counseling_case_learning: "상담 사례 학습",
  relationship_pattern_analysis: "유형 조합·관계 패턴",
  business_planning: "사업·프로그램 기획",
  content_marketing: "콘텐츠·홍보",
  general_agent_task: "일반 작업",
  agent_operation: "에이전트 실행",
};

export function taskTypeLabel(value?: string | null) {
  if (!value) {
    return "미지정";
  }

  return taskTypeLabels[value] ?? value;
}

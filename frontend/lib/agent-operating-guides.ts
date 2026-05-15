export type AgentOperatingGuide = {
  agentId: string;
  title: string;
  summary: string;
  steps: string[];
};

export const agentOperatingGuides: AgentOperatingGuide[] = [
  {
    agentId: "concept_guardian",
    title: "개념수호자 절차",
    summary: "공식 검사 지식과 상담 사례 관찰을 구분하고, 개념 충돌 여부를 먼저 확인합니다.",
    steps: ["관련 MASTER 확인", "공식 개념과 사례 관찰 분리", "충돌 표현 표시", "승인 필요 여부 판단"],
  },
  {
    agentId: "report_editor",
    title: "결과지 에디터 절차",
    summary: "검사 축과 대상 독자를 확인한 뒤 부정적·단정적 표현을 상담형 문장으로 바꿉니다.",
    steps: ["검사와 페이지 확인", "유지할 공식 개념 확인", "Before/After 작성", "품질검수관 검토 요청"],
  },
  {
    agentId: "counseling_coach",
    title: "상담 코치 절차",
    summary: "유형, 상대 유형, 관계 맥락, 질문 의도를 확인하고 실제로 말할 수 있는 답변을 만듭니다.",
    steps: ["유형과 관계 맥락 확인", "감정 인정", "상호작용 해석", "실천 문장 제안"],
  },
  {
    agentId: "case_learner",
    title: "사례학습가 절차",
    summary: "상담 원문을 익명화하고 유형, 감정, 행동, 관계 패턴을 사례 자료로 분리합니다.",
    steps: ["원문 보존", "개인정보 제거", "패턴 추출", "공식 반영 후보 분리"],
  },
  {
    agentId: "relationship_analyst",
    title: "관계분석가 절차",
    summary: "두 유형의 관계 맥락에서 촉발 행동, 해석 차이, 반복 루프, 개입 후보를 정리합니다.",
    steps: ["유형 조합 확인", "관계 맥락 구분", "반복 루프 추출", "개입 후보 연결"],
  },
  {
    agentId: "quality_inspector",
    title: "품질검수관 절차",
    summary: "낙인, 진단, 단정, 위험 표현을 줄이고 공식 반영 전 승인 필요 여부를 확인합니다.",
    steps: ["개념 충돌 확인", "톤 검수", "안전 표현 검수", "승인대기 판단"],
  },
  {
    agentId: "business_designer",
    title: "사업설계자 절차",
    summary: "대상, 문제, 목적, 성과, 예산, 일정, 검사 활용 방식을 먼저 질문합니다.",
    steps: ["고객과 문제 정의", "성과와 제약 확인", "CRATA 검사 활용 설계", "제안서 구조 작성"],
  },
  {
    agentId: "content_strategist",
    title: "콘텐츠전략가 절차",
    summary: "채널, 타깃, 메시지, 전환 목표, 금지 표현을 먼저 확인합니다.",
    steps: ["채널 선택", "타깃 문제 정의", "핵심 메시지 설계", "CTA와 후속 콘텐츠 제안"],
  },
];

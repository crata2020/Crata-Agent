from sqlalchemy.orm import Session

from app.models import Agent


AGENT_SEEDS = [
    {
        "id": "crata_ceo",
        "name": "CRATA CEO",
        "display_name": "CRATA CEO",
        "role": "전체 라우팅과 작업 조율",
        "description": "요청을 분류하고 적절한 에이전트와 워크플로우를 결정합니다.",
        "status": "idle",
        "enabled": True,
        "color": "#1F6B57",
    },
    {
        "id": "concept_guardian",
        "name": "Concept Guardian",
        "display_name": "개념수호자",
        "role": "공식 지식과 개념 일관성 검토",
        "description": "검사 개념, 유형 정의, 공식 지식 충돌 여부를 검토합니다.",
        "status": "idle",
        "enabled": True,
        "color": "#6A5EA8",
    },
    {
        "id": "report_editor",
        "name": "Report Editor",
        "display_name": "결과지 에디터",
        "role": "검사 결과지 문구 작성과 수정",
        "description": "결과지 문구를 작성하고 대상별 톤을 조정합니다.",
        "status": "idle",
        "enabled": True,
        "color": "#34699A",
    },
    {
        "id": "counseling_coach",
        "name": "Counseling Coach",
        "display_name": "상담 코치",
        "role": "유형 기반 상담 답변 초안",
        "description": "유형과 관계 맥락을 바탕으로 상담 답변 초안을 만듭니다.",
        "status": "idle",
        "enabled": True,
        "color": "#2F7D4E",
    },
    {
        "id": "case_learner",
        "name": "Case Learner",
        "display_name": "사례학습가",
        "role": "상담 사례 추출과 학습 후보 생성",
        "description": "상담 전사록을 익명화하고 사례 기반 학습 후보를 만듭니다.",
        "status": "idle",
        "enabled": True,
        "color": "#C9852B",
    },
    {
        "id": "relationship_analyst",
        "name": "Relationship Analyst",
        "display_name": "관계분석가",
        "role": "유형 조합과 관계 패턴 분석",
        "description": "유형 조합, 관계 맥락, 반복 상호작용 루프를 분석합니다.",
        "status": "idle",
        "enabled": True,
        "color": "#4B7F83",
    },
    {
        "id": "quality_inspector",
        "name": "Quality Inspector",
        "display_name": "품질검수관",
        "role": "안전성, 톤, 승인 준비 상태 검수",
        "description": "낙인적 표현, 위험 표현, 공식 반영 가능 여부를 검수합니다.",
        "status": "idle",
        "enabled": True,
        "color": "#B83A3A",
    },
    {
        "id": "business_designer",
        "name": "Business Designer",
        "display_name": "사업설계자",
        "role": "제안서, 상품, 프로그램 기획",
        "description": "2차 확장 예정 에이전트입니다.",
        "status": "planned",
        "enabled": False,
        "color": "#7A5A2E",
    },
    {
        "id": "content_strategist",
        "name": "Content Strategist",
        "display_name": "콘텐츠전략가",
        "role": "홍보, 유튜브, 블로그, 홈페이지 문구",
        "description": "2차 확장 예정 에이전트입니다.",
        "status": "planned",
        "enabled": False,
        "color": "#B35C3E",
    },
    {
        "id": "operations_secretary",
        "name": "Operations Secretary",
        "display_name": "운영비서",
        "role": "브리핑, 승인 요약, 자동화",
        "description": "2차 확장 예정 에이전트입니다.",
        "status": "planned",
        "enabled": False,
        "color": "#5F6B64",
    },
]


def seed_agents(db: Session) -> None:
    for seed in AGENT_SEEDS:
        if db.get(Agent, seed["id"]) is not None:
            continue

        db.add(Agent(**seed, prompt=""))

    db.commit()

from app.services.model_gateway import ModelGateway


def test_business_planning_fallback_uses_expert_planning_structure() -> None:
    draft = ModelGateway().draft(
        task_title="공공기관 회복 프로그램 제안서",
        task_type="business_planning",
        context=(
            "# 사용자 작업\n"
            "공공기관 연수 프로그램에 CRATA 검사를 넣는 기획서를 만든다.\n\n"
            "# CRATA 지식 컨텍스트\n"
            "개인행동 동기검사 MASTER\n"
            "집단행동검사 MASTER\n"
            "사업설계자\n"
            "먼저 물어볼 질문\n"
        ),
    )

    assert "MVP 에이전트 워크플로우" not in draft
    assert "## 먼저 확인할 질문" in draft
    assert "대상" in draft
    assert "예산" in draft
    assert "## CRATA 검사 활용 방향" in draft
    assert "개인행동 동기검사" in draft
    assert "집단행동검사" in draft
    assert "## 제안서 기본 구조" in draft
    assert "기대효과" in draft


def test_report_phrase_revision_fallback_uses_report_editor_structure() -> None:
    draft = ModelGateway().draft(
        task_title="결과지 문구 수정",
        task_type="report_phrase_revision",
        context=(
            "# 사용자 작업\n"
            "집단검사 결과지 문구를 더 부드럽게 수정한다.\n\n"
            "# CRATA 지식 컨텍스트\n"
            "집단행동검사 MASTER\n"
            "결과지 에디터\n"
            "품질검수관\n"
        ),
    )

    assert "MVP 에이전트 워크플로우" not in draft
    assert "## 문구 수정 작업 절차" in draft
    assert "## Before / After 초안" in draft
    assert "낙인" in draft
    assert "개념수호자" in draft
    assert "품질검수관" in draft


def test_fallback_draft_surfaces_candidate_clarifying_questions() -> None:
    draft = ModelGateway().draft(
        task_title="기관 프로그램 기획",
        task_type="business_planning",
        context=(
            "# 사용자 작업\n"
            "기관 프로그램 기획을 진행한다.\n\n"
            "# 먼저 확인할 질문\n\n"
            "1. 대상 기관 또는 고객은 누구인가?\n"
            "2. 예산, 일정, 운영 형태의 제한은 무엇인가?\n\n"
            "# CRATA 지식 컨텍스트\n"
            "개인행동 동기검사 MASTER\n"
        ),
    )

    assert "## 입력에서 넘어온 확인 질문" in draft
    assert "대상 기관 또는 고객은 누구인가?" in draft
    assert "예산, 일정, 운영 형태의 제한은 무엇인가?" in draft
